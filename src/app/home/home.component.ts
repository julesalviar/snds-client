import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import {UserService} from '../common/services/user.service';
import {CommonModule, DecimalPipe} from '@angular/common';
import {MatBadgeModule} from '@angular/material/badge';
import {Router} from '@angular/router';
import {ReferenceDataService} from "../common/services/reference-data.service";
import {SchoolNeedService} from "../common/services/school-need.service";
import {AuthService} from "../auth/auth.service";
import {BehaviorSubject, catchError, defer, forkJoin, from, map, Observable, of, shareReplay, switchMap, tap} from "rxjs";
import {MatIcon} from "@angular/material/icon";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {getSchoolYear} from "../common/date-utils";
import {AipService} from "../common/services/aip.service";
import {AIP_STATUSES, AipStatus} from "../common/enums/aip-status.enum";
import {UserType} from "../registration/user-type.enum";
import {MatCardModule} from "@angular/material/card";
import {SchoolInfo} from "../common/model/school-need.model";
import {InternalReferenceDataService} from "../common/services/internal-reference-data.service";

interface TreeNode {
  name: string;
  children?: TreeNode[];
  expanded?: boolean;
  count?: number;
}

interface HomeLoadingState {
  internalRefData: boolean;
  schoolNeeds: boolean;
  aipStats: boolean;
}

/** Full home view state – single source for template; use with async pipe. */
export interface HomeState {
  loading: HomeLoadingState;
  name: string | undefined;
  userRole: string | undefined;
  treeData: TreeNode[];
  schoolNeedData: any[];
  schoolInfo: SchoolInfo | null;
  divisionName: string;
  divisionLogoUrl: string | null;
  schoolLogoUrl: string | null;
  logoError: boolean;
  aipStatusStats: Map<AipStatus, number>;
  totalAips: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatIcon, MatProgressBarModule, MatCardModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [DecimalPipe]
})
export class HomeComponent implements OnInit {
  @ViewChild('logoContainer') logoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('logoPreview') logoPreview!: ElementRef<HTMLDivElement>;

  protected readonly UserType = UserType;
  protected readonly AIP_STATUSES = AIP_STATUSES;

  /** Single stream for template – use with async pipe. No manual subscriptions. */
  readonly homeState$: Observable<HomeState>;

  private readonly homeStateSubject: BehaviorSubject<HomeState>;

  constructor(
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly referenceDataService: ReferenceDataService,
    private readonly internalReferenceDataService: InternalReferenceDataService,
    private readonly schoolNeedService: SchoolNeedService,
    private readonly authService: AuthService,
    private readonly aipService: AipService,
    private decimalPipe: DecimalPipe,
  ) {
    const initial = this.getInitialState();
    this.homeStateSubject = new BehaviorSubject(initial);
    this.homeState$ = this.homeStateSubject.asObservable().pipe(shareReplay(1));
  }

  ngOnInit(): void {
    // Pipeline pushes after each step via tap() so UI updates progressively (tree, then AIP, etc.).
    this.buildLoadPipeline().subscribe({
      error: (err) => console.error('Home load error:', err),
    });
  }

  private getInitialState(): HomeState {
    const name = this.authService.getName();
    const userRole = this.authService.getActiveRole();
    if (!name || !userRole) console.warn('User information is incomplete.');
    const aipStatusStats = new Map<AipStatus, number>();
    AIP_STATUSES.forEach((s) => aipStatusStats.set(s, 0));
    return {
      loading: { internalRefData: true, schoolNeeds: true, aipStats: true },
      name,
      userRole,
      treeData: [],
      schoolNeedData: [],
      schoolInfo: null,
      divisionName: '',
      divisionLogoUrl: null,
      schoolLogoUrl: null,
      logoError: false,
      aipStatusStats,
      totalAips: 0,
    };
  }

  private buildLoadPipeline(): Observable<HomeState> {
    return defer(() => {
      const initial = this.getInitialState();
      return of(initial).pipe(
        switchMap((s) =>
          this.loadInternalRefData$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
        switchMap((s) =>
          this.loadSchoolNeeds$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
        switchMap((s) =>
          this.loadAipStatsIfNeeded$(s).pipe(
            tap((result) => this.homeStateSubject.next(result)),
          ),
        ),
      );
    });
  }

  private loadInternalRefData$(state: HomeState): Observable<HomeState> {
    return from(this.internalReferenceDataService.initialize()).pipe(
      map(() => {
        const division = this.internalReferenceDataService.get('division');
        return {
          ...state,
          loading: { ...state.loading, internalRefData: false },
          divisionName: division?.divisionName ?? '',
          divisionLogoUrl: division?.logoUrl ?? null,
          logoError: false,
        };
      }),
      catchError((err) => {
        console.error('Error loading internal ref:', err);
        return of({ ...state, loading: { ...state.loading, internalRefData: false } });
      }),
    );
  }

  toggleChildren(state: HomeState, node: TreeNode): void {
    if (!node.children?.length) return;
    const next = this.toggleNodeExpanded(state.treeData, node);
    this.homeStateSubject.next({ ...state, treeData: next });
  }

  private toggleNodeExpanded(tree: TreeNode[], target: TreeNode): TreeNode[] {
    return tree.map((n) =>
      n === target
        ? { ...n, expanded: !n.expanded }
        : n.children
          ? { ...n, children: this.toggleNodeExpanded(n.children, target) }
          : n,
    );
  }

  onChildClick(child: TreeNode, state: HomeState): void {
    const parentName = state.treeData.find((node) => node.children?.includes(child))?.name;
    this.userService.setContribution({ name: parentName, specificContribution: child.name });
    let path: string;
    const queryParams: Record<string, string> = {};
    const role = state.userRole;
    switch (role) {
      case 'schoolAdmin':
        path = '/school-admin/school-needs';
        break;
      case 'divisionAdmin':
        path = '/division-admin/school-needs';
        break;
      case 'stakeholder':
        path = '/stakeholder/school-needs';
        queryParams['selectedContribution'] = child.name;
        break;
      default:
        path = '/guest/school-needs';
        queryParams['selectedContribution'] = child.name;
        if (role) console.warn(`Unknown or undefined role: ${role}`);
        break;
    }
    this.router.navigate([path], { queryParams });
  }

  private loadSchoolNeeds$(state: HomeState): Observable<HomeState> {
    return forkJoin({
      tree: of(this.referenceDataService.get<TreeNode[]>('contributionTree')),
      needs: this.fetchAllSchoolNeedsData(),
    }).pipe(
      map(({ tree, needs }) => {
        const treeWithCounts = this.mapCountsToTreeData(tree, needs.data);
        return {
          ...state,
          loading: { ...state.loading, schoolNeeds: false },
          treeData: treeWithCounts,
          schoolNeedData: needs.data,
          schoolInfo: needs.schoolInfo,
          schoolLogoUrl: needs.schoolInfo?.logoUrl ?? null,
          logoError: false,
        };
      }),
      catchError((err) => {
        console.error('Error fetching school needs:', err);
        return of({ ...state, loading: { ...state.loading, schoolNeeds: false } });
      }),
    );
  }

  private fetchAllSchoolNeedsData(
    page = 1,
    size = 10000,
    acc: any[] = [],
    schoolName = '',
    schoolInfo: SchoolInfo | null = null,
  ): Observable<{ data: any[]; schoolName: string; schoolInfo: SchoolInfo | null }> {
    return this.schoolNeedService
      .getSchoolNeeds(page, size, getSchoolYear(), undefined, undefined, true)
      .pipe(
        switchMap((res) => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];
          const sn = page === 1 && res?.school ? res.school.schoolName || '' : schoolName;
          const si = page === 1 && res?.school ? res.school : schoolInfo;
          if (currentData.length < size) {
            return of({ data: allData, schoolName: sn, schoolInfo: si });
          }
          return this.fetchAllSchoolNeedsData(page + 1, size, allData, sn, si);
        }),
      );
  }

  private mapCountsToTreeData(tree: TreeNode[], needs: any[]): TreeNode[] {
    const out = JSON.parse(JSON.stringify(tree)) as TreeNode[];
    for (const node of out) {
      if (node.children) {
        for (const child of node.children) {
          const specificNeeds = needs.filter((n: any) => n.specificContribution === child.name);
          let count = specificNeeds.reduce((sum: number, n: any) => {
            const totalEngaged = (n.engagements ?? []).reduce(
              (engAcc: number, eng: any) => engAcc + (eng.quantity ?? 0),
              0,
            );
            return sum + (n.quantity ?? 0) - totalEngaged;
          }, 0);
          child.count = count <= 0 ? undefined : count;
        }
      }
    }
    return out;
  }

  private loadAipStatsIfNeeded$(state: HomeState): Observable<HomeState> {
    const role = state.userRole;
    if (role !== UserType.SchoolAdmin && role !== UserType.DivisionAdmin) {
      return of({ ...state, loading: { ...state.loading, aipStats: false } });
    }
    const schoolId = role === UserType.SchoolAdmin ? this.authService.getSchoolId() : undefined;
    return this.fetchAllAips(1, 1000, [], schoolId).pipe(
      map((aips) => {
        const stats = new Map<AipStatus, number>();
        AIP_STATUSES.forEach((s) => stats.set(s, 0));
        aips.forEach((aip: any) => {
          if (aip.status && stats.has(aip.status)) {
            stats.set(aip.status, (stats.get(aip.status) ?? 0) + 1);
          }
        });
        return {
          ...state,
          loading: { ...state.loading, aipStats: false },
          aipStatusStats: stats,
          totalAips: aips.length,
        };
      }),
      catchError((err) => {
        console.error('Error loading AIP statistics:', err);
        return of({ ...state, loading: { ...state.loading, aipStats: false } });
      }),
    );
  }

    private fetchAllAips(page: number, size: number, acc: any[] = [], schoolId?: string): Observable<any[]> {
      return this.aipService.getAips(page, size, schoolId).pipe(
        switchMap(res => {
          const currentData = res?.data ?? [];
          const allData = [...acc, ...currentData];

          if (currentData.length < size) {
            return of(allData);
          }

          return this.fetchAllAips(page + 1, size, allData, schoolId);
        })
      );
    }

  getStatusPercentage(state: HomeState, status: AipStatus): number {
    if (state.totalAips === 0) return 0;
    const count = state.aipStatusStats.get(status) || 0;
    return Math.round((count / state.totalAips) * 100);
  }

  getStatusCountFormatted(state: HomeState, status: AipStatus): string {
    const count = state.aipStatusStats.get(status) || 0;
    const formattedCount = this.decimalPipe.transform(count, '1.0-2');
    const formattedTotal = this.decimalPipe.transform(state.totalAips, '1.0-2');
    return `${formattedCount}/${formattedTotal}`;
  }

  isSchoolAdmin(state: HomeState): boolean {
    return state.userRole === UserType.SchoolAdmin;
  }

  isDivisionAdmin(state: HomeState): boolean {
    return state.userRole === UserType.DivisionAdmin;
  }

  shouldShowStats(state: HomeState): boolean {
    return this.isSchoolAdmin(state) || this.isDivisionAdmin(state);
  }

  isHeaderLoading(state: HomeState): boolean {
    if (this.isDivisionAdmin(state)) return state.loading.internalRefData;
    if (this.isSchoolAdmin(state)) return state.loading.schoolNeeds;
    return false;
  }

  getWelcomeHeaderName(state: HomeState): string {
    switch (state.userRole) {
      case UserType.SchoolAdmin:
        return state.schoolInfo?.schoolName ?? '';
      case UserType.DivisionAdmin:
        return state.divisionName;
      default:
        return '-';
    }
  }

  navigateToAip(): void {
    this.router.navigate(['/school-admin/aip']);
  }

  onLogoError(state: HomeState): void {
    this.homeStateSubject.next({ ...state, logoError: true });
  }

    onLogoHover(event: MouseEvent): void {
      if (this.logoContainer && this.logoPreview) {
        const rect = this.logoContainer.nativeElement.getBoundingClientRect();
        const preview = this.logoPreview.nativeElement;
        const top = rect.top + rect.height / 2;
        const left = rect.right + 16;
        preview.style.top = `${top}px`;
        preview.style.left = `${left}px`;
        preview.style.transform = 'translateY(-50%)';
      }
    }
  }
