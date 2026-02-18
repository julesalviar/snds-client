import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { Office } from '../../common/model/office.model';

@Component({
  standalone: true,
  selector: 'app-office-division-submenu',
  imports: [CommonModule, RouterModule, MatMenuModule, MatButtonModule],
  template: `
    <button mat-menu-item
      #trigger="matMenuTrigger"
      [matMenuTriggerFor]="divisionMenu"
      (mouseenter)="onDivisionHover()">
      {{ division }}
    </button>
    <mat-menu #divisionMenu="matMenu" [overlapTrigger]="true">
      <button mat-menu-item
        *ngFor="let office of offices"
        [disabled]="office.ppaPlanCount === 0"
        [routerLink]="[officeTableBasePath + '/office-table']"
        [queryParams]="{ division: office.division, subject: office.name, officeId: office._id }"
        (click)="menuItemClick.emit()">
        {{ office.name }}
      </button>
    </mat-menu>
  `,
})
export class OfficeDivisionSubmenuComponent {
  @Input({ required: true }) division!: string;
  @Input({ required: true }) offices!: Office[];
  /** Base path for office-table route (e.g. '/stakeholder' or '/guest'). Defaults to '/stakeholder'. */
  @Input() officeTableBasePath = '/stakeholder';
  @Output() menuItemClick = new EventEmitter<void>();
  @Output() divisionHover = new EventEmitter<OfficeDivisionSubmenuComponent>();

  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;

  onDivisionHover(): void {
    this.divisionHover.emit(this);
    this.menuTrigger?.openMenu();
  }

  closeMenu(): void {
    this.menuTrigger?.closeMenu();
  }
}
