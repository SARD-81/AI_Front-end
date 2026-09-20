import type { AiResource } from '@/lib/api/chat';

export type SourceGroup = {
  key: string;
  title?: string;
  dataset?: string;
  excerpts: string[];
};
export function groupSources(resources: AiResource[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  resources.forEach((source, index) => {
    const title = source.documentName?.trim();
    const dataset = source.datasetName?.trim();
    const key = JSON.stringify([
      source.datasetId?.trim() || dataset || '',
      source.documentId?.trim() || title || source.segmentId?.trim() || index
    ]);
    const group = groups.get(key) ?? { key, title, dataset, excerpts: [] };
    const excerpt = source.content?.trim();
    if (excerpt && !group.excerpts.includes(excerpt))
      group.excerpts.push(excerpt);
    groups.set(key, group);
  });
  return [...groups.values()];
}
