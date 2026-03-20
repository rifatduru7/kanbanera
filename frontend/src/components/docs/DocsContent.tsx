import { useMemo } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import type { DocPage } from '../../lib/docs/types';
import { docsMdxComponents } from './mdx';
import { DocsPager } from './DocsPager';

export function DocsContent({
  doc,
  component: Component,
  previous,
  next,
}: {
  doc: DocPage;
  component: ComponentType<{ components?: Record<string, ComponentType<any>> }> | null;
  previous?: DocPage;
  next?: DocPage;
}) {
  const { t, i18n } = useTranslation();

  const updatedAt = useMemo(() => {
    if (!doc.frontmatter.updatedAt) return null;

    return new Date(doc.frontmatter.updatedAt).toLocaleDateString(
      i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
  }, [doc.frontmatter.updatedAt, i18n.language]);

  return (
    <article className="docs-article glass-card">
      <div className="docs-article-inner">
        <header className="docs-article-header">
          <div className="docs-tag-row">
            <span className="docs-section-tag">{t(`docs.sections.${doc.frontmatter.section}`)}</span>
            {updatedAt ? (
              <span className="docs-updated-at">
                <CalendarBlank className="size-4" />
                {t('docs.last_updated', { date: updatedAt })}
              </span>
            ) : null}
          </div>
          <h1>{doc.frontmatter.title}</h1>
          <p className="docs-lead">{doc.frontmatter.description}</p>
          {doc.tags.length > 0 ? (
            <div className="docs-chip-row">
              {doc.tags.map((tag) => (
                <span key={tag} className="docs-chip">{tag}</span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="docs-prose">
          {Component ? <Component components={docsMdxComponents} /> : null}
        </div>

        <DocsPager previous={previous} next={next} />
      </div>
    </article>
  );
}
