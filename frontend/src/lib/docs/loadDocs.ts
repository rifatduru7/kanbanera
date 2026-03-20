import { docsRegistry } from './buildDocsRegistry';
import type { DocPage, DocsLanguage, DocsSection } from './types';

export function getPreferredDocsLanguage(language?: string): DocsLanguage {
  return language?.startsWith('tr') ? 'tr' : 'en';
}

export function getDocsForLanguage(language?: string): DocPage[] {
  const preferredLanguage = getPreferredDocsLanguage(language);
  return docsRegistry.byLanguage[preferredLanguage];
}

export function getDocBySlug(slug: string, language?: string): DocPage | undefined {
  const preferredLanguage = getPreferredDocsLanguage(language);
  return (
    docsRegistry.byLanguage[preferredLanguage].find((page) => page.slug === slug) ??
    docsRegistry.byLanguage.en.find((page) => page.slug === slug)
  );
}

export function getDocsSections(language?: string): DocsSection[] {
  const sections = new Map<string, DocPage[]>();

  for (const page of getDocsForLanguage(language)) {
    const sectionPages = sections.get(page.frontmatter.section) ?? [];
    sectionPages.push(page);
    sections.set(page.frontmatter.section, sectionPages);
  }

  return Array.from(sections.entries())
    .map(([section, pages]) => ({
      section,
      pages: pages.sort((left, right) => {
        if (left.frontmatter.order !== right.frontmatter.order) {
          return left.frontmatter.order - right.frontmatter.order;
        }
        return left.frontmatter.title.localeCompare(right.frontmatter.title);
      }),
    }))
    .sort((left, right) => {
      const leftOrder = left.pages[0]?.frontmatter.order ?? 0;
      const rightOrder = right.pages[0]?.frontmatter.order ?? 0;
      return leftOrder - rightOrder;
    });
}

export function getAdjacentDocs(slug: string, language?: string): {
  previous?: DocPage;
  next?: DocPage;
} {
  const pages = getDocsForLanguage(language);
  const currentIndex = pages.findIndex((page) => page.slug === slug);

  if (currentIndex === -1) {
    return {};
  }

  return {
    previous: pages[currentIndex - 1],
    next: pages[currentIndex + 1],
  };
}

export function getFirstDocSlug(language?: string): string | undefined {
  return getDocsForLanguage(language)[0]?.slug;
}
