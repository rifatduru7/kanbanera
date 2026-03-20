import type { TocHeading } from './types';

const headingPattern = /^(##|###)\s+(.+)$/gm;

export function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = [];

  for (const match of content.matchAll(headingPattern)) {
    const hashes = match[1];
    const text = match[2]
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[*_`>#]/g, '')
      .trim();

    const id = slugify(text);
    if (!id) continue;

    headings.push({
      id,
      text,
      level: hashes.length === 2 ? 2 : 3,
    });
  }

  return headings;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
