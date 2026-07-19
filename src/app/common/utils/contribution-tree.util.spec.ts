import {
  filterContributionOptions,
  filterContributionSearchOptions,
  flattenContributionTree,
  mapCountsToContributionTree,
  normalizeContributionKey,
} from './contribution-tree.util';

describe('contribution-tree.util', () => {
  describe('normalizeContributionKey', () => {
    it('trims, lowercases, and collapses spaces', () => {
      expect(normalizeContributionKey('  Fans  ')).toBe('fans');
      expect(normalizeContributionKey('Fire   Extinguisher')).toBe('fire extinguisher');
    });
  });

  describe('filterContributionOptions', () => {
    it('filters by case-insensitive substring', () => {
      const options = ['INFRASTRUCTURE', 'FURNITURE', 'APPLIANCES'];
      expect(filterContributionOptions(options, 'furn')).toEqual(['FURNITURE']);
      expect(filterContributionOptions(options, '')).toEqual(options);
    });
  });

  describe('flattenContributionTree / filterContributionSearchOptions', () => {
    const tree = [
      {
        name: 'INFRASTRUCTURE',
        children: [
          { name: 'Classroom', count: 2 },
          { name: 'Fence' },
        ],
      },
      {
        name: 'FURNITURE',
        children: [{ name: 'Chairs', count: 5 }],
      },
    ];

    it('flattens type → specific options', () => {
      expect(flattenContributionTree(tree)).toEqual([
        { type: 'INFRASTRUCTURE', specific: 'Classroom', count: 2 },
        { type: 'INFRASTRUCTURE', specific: 'Fence', count: undefined },
        { type: 'FURNITURE', specific: 'Chairs', count: 5 },
      ]);
    });

    it('filters by type or specific name', () => {
      const flat = flattenContributionTree(tree);
      expect(filterContributionSearchOptions(flat, 'chair')).toEqual([
        { type: 'FURNITURE', specific: 'Chairs', count: 5 },
      ]);
      expect(filterContributionSearchOptions(flat, 'infra').length).toBe(2);
    });
  });

  describe('mapCountsToContributionTree', () => {
    it('maps leaf counts with normalized name matching and leaves parents collapsed', () => {
      const tree = [
        {
          name: 'Parent',
          children: [{ name: 'Books' }, { name: 'Chairs ' }, { name: 'Desks' }],
        },
        {
          name: 'Empty',
          children: [{ name: 'Unused' }],
        },
      ];
      const counts = [
        { specificContribution: 'Books', count: 3 },
        { specificContribution: 'Chairs', count: 2 },
        { specificContribution: 'Desks', count: 0 },
      ];

      const result = mapCountsToContributionTree(tree, counts);

      expect(result[0].count).toBeUndefined();
      expect(result[0].expanded).toBe(false);
      expect(result[0].children?.[0].count).toBe(3);
      expect(result[0].children?.[1].name).toBe('Chairs');
      expect(result[0].children?.[1].count).toBe(2);
      expect(result[0].children?.[2].count).toBeUndefined();
      expect(result[1].count).toBeUndefined();
      expect(result[1].expanded).toBe(false);
    });
  });
});
