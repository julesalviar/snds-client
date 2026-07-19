/** Tree shape used by reference_data.contributionTree and home widget counts. */
export interface ContributionTreeNode {
  name: string;
  children?: ContributionTreeNode[];
  expanded?: boolean;
  count?: number;
}

/** Flat option for home search autocomplete (type → specific). */
export interface ContributionSearchOption {
  type: string;
  specific: string;
  count?: number;
}

/** Normalize contribution names for matching (trim, collapse spaces, lowercase). */
export function normalizeContributionKey(value: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Case-insensitive substring filter for contribution type/specific lists. */
export function filterContributionOptions(options: string[], query: string): string[] {
  const filterValue = (query ?? '').trim().toLowerCase();
  if (!filterValue) {
    return [...options];
  }
  return options.filter((option) => option.toLowerCase().includes(filterValue));
}

/** Flatten tree into searchable leaf options with optional unmet-need counts. */
export function flattenContributionTree(
  tree: ContributionTreeNode[],
): ContributionSearchOption[] {
  return tree.flatMap((node) =>
    (node.children ?? []).map((child) => ({
      type: node.name,
      specific: child.name,
      count: child.count,
    })),
  );
}

/** Filter flat search options by type or specific contribution name. */
export function filterContributionSearchOptions(
  options: ContributionSearchOption[],
  query: string,
): ContributionSearchOption[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) {
    return [...options];
  }
  return options.filter(
    (opt) =>
      opt.specific.toLowerCase().includes(q) ||
      opt.type.toLowerCase().includes(q),
  );
}

/**
 * Map unmet-need counts onto leaf nodes.
 * Uses normalized keys so trailing spaces in reference data still match API names.
 * Preserves each node's expanded state (home tree stays collapsed by default).
 */
export function mapCountsToContributionTree(
  tree: ContributionTreeNode[],
  counts: { specificContribution: string; count: number }[],
): ContributionTreeNode[] {
  const countByContribution = new Map<string, number>();
  for (const row of counts) {
    const key = normalizeContributionKey(row.specificContribution);
    if (!key) continue;
    const prev = countByContribution.get(key) ?? 0;
    countByContribution.set(key, prev + (row.count > 0 ? row.count : 0));
  }

  return tree.map((node) => {
    const children = node.children?.map((child) => {
      const trimmedName = (child.name ?? '').trim().replace(/\s+/g, ' ');
      const count = countByContribution.get(normalizeContributionKey(trimmedName));
      return {
        ...child,
        name: trimmedName || child.name,
        count: count != null && count > 0 ? count : undefined,
      };
    });
    const trimmedParent = (node.name ?? '').trim().replace(/\s+/g, ' ');
    return {
      ...node,
      name: trimmedParent || node.name,
      children,
      expanded: !!node.expanded,
    };
  });
}
