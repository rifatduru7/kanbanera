import { extractHeadings, stripMarkdown } from './extractHeadings';
import type { DocFrontmatter, DocPage, DocsLanguage, DocsRegistry } from './types';
import rawDocs from 'virtual:docs-manifest';

const mdxModules = import.meta.glob('/src/content/docs/**/*.mdx') as Record<
  string,
  () => Promise<{ default: React.ComponentType<{ components?: Record<string, React.ComponentType> }> }>
>;

const SUPPORTED_LANGUAGES: DocsLanguage[] = ['tr', 'en'];

function parseScalar(value: string): string | number {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
    return trimmed.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function parseArray(value: string): string[] {
  const inner = value.trim().slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(',')
    .map((item) => parseScalar(item))
    .filter((item): item is string => typeof item === 'string');
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { data: {}, content: raw };
  }

  const [, frontmatterBlock, content] = match;
  const data: Record<string, unknown> = {};

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    data[key] = rawValue.startsWith('[') && rawValue.endsWith(']')
      ? parseArray(rawValue)
      : parseScalar(rawValue);
  }

  return { data, content };
}

function parseDocPath(filePath: string): { lang: DocsLanguage; fullPath: string } {
  const match = filePath.match(/\/src\/content\/docs\/(tr|en)\/(.+)\.mdx(?:\?raw)?$/);
  if (!match) {
    throw new Error(`Unsupported docs path: ${filePath}`);
  }

  return {
    lang: match[1] as DocsLanguage,
    fullPath: match[2],
  };
}

function validateFrontmatter(filePath: string, data: Record<string, unknown>): DocFrontmatter {
  const requiredKeys: Array<keyof DocFrontmatter> = [
    'title',
    'description',
    'slug',
    'section',
    'order',
  ];

  for (const key of requiredKeys) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      throw new Error(`Missing "${key}" in docs frontmatter: ${filePath}`);
    }
  }

  if (typeof data.title !== 'string' ||
      typeof data.description !== 'string' ||
      typeof data.slug !== 'string' ||
      typeof data.section !== 'string' ||
      typeof data.order !== 'number') {
    throw new Error(`Invalid docs frontmatter types in: ${filePath}`);
  }

  return {
    title: data.title,
    description: data.description,
    slug: data.slug,
    section: data.section,
    order: data.order,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

function ensureLanguagePairing(registry: DocsRegistry) {
  const slugMatrix = new Map<string, Set<DocsLanguage>>();

  for (const page of registry.all) {
    if (!slugMatrix.has(page.slug)) {
      slugMatrix.set(page.slug, new Set());
    }
    slugMatrix.get(page.slug)?.add(page.lang);
  }

  for (const [slug, langs] of slugMatrix.entries()) {
    if (langs.size !== SUPPORTED_LANGUAGES.length) {
      console.warn(`[docs] Missing translation pair for slug "${slug}". Falling back to English when needed.`);
    }
  }
}

function createRegistry(): DocsRegistry {
  const pages: DocPage[] = [];
  const slugByLanguage = new Map<string, string>();

  for (const [rawPath, raw] of Object.entries(rawDocs)) {
    const parsedPath = parseDocPath(rawPath);
    const modulePath = rawPath.replace(/\?raw$/, '');
    const loader = mdxModules[modulePath];

    if (!loader) {
      throw new Error(`Missing MDX loader for docs file: ${modulePath}`);
    }

    const { data, content } = parseFrontmatter(raw);
    const frontmatter = validateFrontmatter(modulePath, data);
    const dedupeKey = `${parsedPath.lang}:${frontmatter.slug}`;

    if (slugByLanguage.has(dedupeKey)) {
      throw new Error(`Duplicate docs slug "${frontmatter.slug}" for language "${parsedPath.lang}"`);
    }

    slugByLanguage.set(dedupeKey, modulePath);

    const headings = extractHeadings(content);
    const bodyText = stripMarkdown(content);

    pages.push({
      id: dedupeKey,
      lang: parsedPath.lang,
      slug: frontmatter.slug,
      fullPath: parsedPath.fullPath,
      frontmatter,
      headings,
      excerpt: bodyText.slice(0, 180).trim(),
      raw,
      bodyText,
      tags: frontmatter.tags ?? [],
      load: loader,
    });
  }

  pages.sort((left, right) => {
    if (left.lang !== right.lang) return left.lang.localeCompare(right.lang);
    if (left.frontmatter.order !== right.frontmatter.order) return left.frontmatter.order - right.frontmatter.order;
    return left.frontmatter.title.localeCompare(right.frontmatter.title);
  });

  const registry: DocsRegistry = {
    all: pages,
    byLanguage: {
      tr: pages.filter((page) => page.lang === 'tr'),
      en: pages.filter((page) => page.lang === 'en'),
    },
  };

  ensureLanguagePairing(registry);
  return registry;
}

export const docsRegistry = createRegistry();
