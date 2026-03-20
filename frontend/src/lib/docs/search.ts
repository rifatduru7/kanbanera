import Fuse from 'fuse.js';
import { docsRegistry } from './buildDocsRegistry';
import { getPreferredDocsLanguage } from './loadDocs';
import type { DocSearchEntry, DocsLanguage } from './types';

const searchCache = new Map<DocsLanguage, Fuse<DocSearchEntry>>();

function buildEntries(language: DocsLanguage): DocSearchEntry[] {
  return docsRegistry.byLanguage[language].map((page) => ({
    id: page.id,
    lang: page.lang,
    slug: page.slug,
    title: page.frontmatter.title,
    description: page.frontmatter.description,
    section: page.frontmatter.section,
    tags: page.tags,
    bodyText: page.bodyText,
    headings: page.headings.map((heading) => heading.text),
  }));
}

function getFuse(language: DocsLanguage): Fuse<DocSearchEntry> {
  const cached = searchCache.get(language);
  if (cached) return cached;

  const fuse = new Fuse(buildEntries(language), {
    includeScore: true,
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title', weight: 3 },
      { name: 'description', weight: 2 },
      { name: 'headings', weight: 2 },
      { name: 'tags', weight: 1.6 },
      { name: 'bodyText', weight: 1 },
    ],
  });

  searchCache.set(language, fuse);
  return fuse;
}

export function searchDocs(query: string, language?: string): DocSearchEntry[] {
  const normalized = query.trim();
  if (!normalized) return [];

  const preferredLanguage = getPreferredDocsLanguage(language);
  return getFuse(preferredLanguage)
    .search(normalized)
    .map((result) => result.item);
}
