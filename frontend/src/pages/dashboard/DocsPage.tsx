import { BookOpenText, House, SpinnerGap } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import { DocsContent } from '../../components/docs/DocsContent';
import { DocsLayout } from '../../components/docs/DocsLayout';
import { DocsSidebar } from '../../components/docs/DocsSidebar';
import { DocsToc } from '../../components/docs/DocsToc';
import { getAdjacentDocs, getDocBySlug, getDocsSections, getFirstDocSlug } from '../../lib/docs/loadDocs';

export function DocsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const slug = params['*'] ?? '';
  const [searchValue, setSearchValue] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [DocComponent, setDocComponent] = useState<ComponentType<{ components?: Record<string, ComponentType<any>> }> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sections = useMemo(() => getDocsSections(i18n.language), [i18n.language]);
  const firstSlug = useMemo(() => getFirstDocSlug(i18n.language), [i18n.language]);
  const currentDoc = useMemo(() => (slug ? getDocBySlug(slug, i18n.language) : undefined), [slug, i18n.language]);
  const adjacent = useMemo(
    () => (currentDoc ? getAdjacentDocs(currentDoc.slug, i18n.language) : {}),
    [currentDoc, i18n.language],
  );

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    if (!currentDoc) {
      setDocComponent(null);
      return undefined;
    }

    setIsLoading(true);
    currentDoc.load()
      .then((module) => {
        if (!cancelled) {
          setDocComponent(() => module.default);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocComponent(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentDoc]);

  const handleNavigate = (nextSlug: string) => {
    navigate(`/docs/${nextSlug}`);
    setSearchValue('');
    setMobileSidebarOpen(false);
  };

  if (!slug) {
    if (firstSlug) {
      return <Navigate to={`/docs/${firstSlug}`} replace />;
    }

    return (
      <div className="docs-loading glass-card">
        <SpinnerGap className="size-6 animate-spin text-primary" />
        <span>{t('docs.loading')}</span>
      </div>
    );
  }

  if (!currentDoc) {
    return (
      <div className="docs-empty-state glass-card">
        <BookOpenText className="size-10 text-primary" weight="duotone" />
        <h2>{t('docs.not_found_title')}</h2>
        <p>{t('docs.not_found_description')}</p>
        <Link to="/docs" className="btn-primary">
          <House className="size-4" />
          <span>{t('docs.back_home')}</span>
        </Link>
      </div>
    );
  }

  return (
    <DocsLayout
      mobileSidebarOpen={mobileSidebarOpen}
      onToggleMobileSidebar={() => setMobileSidebarOpen((current) => !current)}
      sidebar={(
        <DocsSidebar
          sections={sections}
          activeSlug={currentDoc.slug}
          language={i18n.language}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onNavigate={handleNavigate}
        />
      )}
      content={isLoading ? (
        <div className="docs-loading glass-card">
          <SpinnerGap className="size-6 animate-spin text-primary" />
          <span>{t('docs.loading')}</span>
        </div>
      ) : (
        <DocsContent
          doc={currentDoc}
          component={DocComponent}
          previous={adjacent.previous}
          next={adjacent.next}
        />
      )}
      toc={<DocsToc headings={currentDoc.headings} />}
    />
  );
}
