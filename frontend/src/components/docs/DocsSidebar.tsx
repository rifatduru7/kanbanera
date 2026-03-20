import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DocsSection } from '../../lib/docs/types';
import { DocsSearch } from './DocsSearch';

interface DocsSidebarProps {
  sections: DocsSection[];
  activeSlug?: string;
  language: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNavigate: (slug: string) => void;
}

export function DocsSidebar({
  sections,
  activeSlug,
  language,
  searchValue,
  onSearchChange,
  onNavigate,
}: DocsSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-sticky">
        <div className="docs-sidebar-top">
          <div className="docs-sidebar-intro">
            <p className="docs-kicker">{t('docs.kicker')}</p>
            <h2 className="docs-sidebar-title">{t('docs.title')}</h2>
            <p className="docs-sidebar-copy">{t('docs.description')}</p>
          </div>

          <DocsSearch
            language={language}
            value={searchValue}
            onChange={onSearchChange}
            onSelect={onNavigate}
          />
        </div>

        <div className="docs-sidebar-scroll">
          <div className="docs-sidebar-sections">
            {sections.map((section) => (
              <div key={section.section} className="docs-sidebar-section">
                <p className="docs-sidebar-section-title">
                  {t(`docs.sections.${section.section}`)}
                </p>
                <div className="flex flex-col gap-1">
                  {section.pages.map((page) => (
                    <NavLink
                      key={page.id}
                      to={`/docs/${page.slug}`}
                      className={({ isActive }) =>
                        `docs-sidebar-link ${isActive || activeSlug === page.slug ? 'docs-sidebar-link-active' : ''}`
                      }
                    >
                      <span className="docs-sidebar-link-title">{page.frontmatter.title}</span>
                      <span className="docs-sidebar-link-description">{page.frontmatter.description}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
