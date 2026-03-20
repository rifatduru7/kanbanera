import type { ComponentType } from 'react';

export type DocsLanguage = 'tr' | 'en';

export interface DocFrontmatter {
  title: string;
  description: string;
  slug: string;
  section: string;
  order: number;
  tags?: string[];
  updatedAt?: string;
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocSearchEntry {
  id: string;
  lang: DocsLanguage;
  slug: string;
  title: string;
  description: string;
  section: string;
  tags: string[];
  bodyText: string;
  headings: string[];
}

export interface DocPage {
  id: string;
  lang: DocsLanguage;
  slug: string;
  fullPath: string;
  frontmatter: DocFrontmatter;
  headings: TocHeading[];
  excerpt: string;
  raw: string;
  bodyText: string;
  tags: string[];
  load: () => Promise<{ default: ComponentType<{ components?: Record<string, ComponentType> }> }>;
}

export interface DocsSection {
  section: string;
  pages: DocPage[];
}

export interface DocsRegistry {
  all: DocPage[];
  byLanguage: Record<DocsLanguage, DocPage[]>;
}
