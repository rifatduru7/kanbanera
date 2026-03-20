import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DocPage } from '../../lib/docs/types';

export function DocsPager({
  previous,
  next,
}: {
  previous?: DocPage;
  next?: DocPage;
}) {
  const { t } = useTranslation();

  if (!previous && !next) {
    return null;
  }

  return (
    <div className="docs-pager">
      {previous ? (
        <Link to={`/docs/${previous.slug}`} className="docs-pager-link">
          <ArrowLeft className="size-4" />
          <span>
            <span className="docs-pager-caption">{t('docs.previous')}</span>
            <span className="docs-pager-title">{previous.frontmatter.title}</span>
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link to={`/docs/${next.slug}`} className="docs-pager-link docs-pager-link-next">
          <span>
            <span className="docs-pager-caption">{t('docs.next')}</span>
            <span className="docs-pager-title">{next.frontmatter.title}</span>
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
