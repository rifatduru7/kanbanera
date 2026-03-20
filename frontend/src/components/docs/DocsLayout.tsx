import { List, X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function DocsLayout({
  sidebar,
  content,
  toc,
  mobileSidebarOpen,
  onToggleMobileSidebar,
}: {
  sidebar: ReactNode;
  content: ReactNode;
  toc: ReactNode;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="docs-shell">
      <div className="docs-mobile-bar">
        <button type="button" onClick={onToggleMobileSidebar} className="docs-mobile-toggle">
          {mobileSidebarOpen ? <X className="size-4" /> : <List className="size-4" />}
          <span>{mobileSidebarOpen ? t('docs.close_navigation') : t('docs.open_navigation')}</span>
        </button>
      </div>

      <div className="docs-grid">
        <div className="docs-rail docs-rail-left hidden xl:block">{sidebar}</div>
        <div className="docs-main">{content}</div>
        <div className="docs-rail docs-rail-right hidden xl:block">{toc}</div>
      </div>

      {mobileSidebarOpen ? (
        <>
          <button type="button" onClick={onToggleMobileSidebar} className="docs-mobile-overlay" />
          <div className="docs-mobile-sidebar">{sidebar}</div>
        </>
      ) : null}
    </div>
  );
}
