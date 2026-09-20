import { expect, it } from 'vitest';
import { groupSources } from './sources';
it('groups all distinct excerpts without mixing datasets or duplicate text', () => {
  const groups = groupSources([
    { datasetId: 'a', documentId: 'doc', content: 'First' },
    { datasetId: 'a', documentId: 'doc', content: 'Second', score: 0.9 },
    { datasetId: 'a', documentId: 'doc', content: ' First ' },
    { datasetId: 'b', documentId: 'doc', content: 'Other dataset' }
  ]);
  expect(groups).toHaveLength(2);
  expect(groups[0].excerpts).toEqual(['First', 'Second']);
  expect(groups[1].excerpts).toEqual(['Other dataset']);
});
