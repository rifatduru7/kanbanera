import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TocHeading } from '../../lib/docs/types';

export function DocsToc({ headings }: { headings: TocHeading[] }) {
  const { t } = useTranslation();
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const observers = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (observers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visible[0]) {
          setActiveHeading(visible[0].target.id);
        }
      },
      {
        rootMargin: '0px 0px -72% 0px',
        threshold: [0.2, 0.4, 0.7],
      },
    );

    observers.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  const items = useMemo(() => headings.filter((heading) => heading.level <= 3), [headings]);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="docs-toc">
      <div className="docs-toc-sticky">
        <p className="docs-toc-title">{t('docs.on_this_page')}</p>
        <div className="docs-toc-scroll">
          <nav className="docs-toc-links">
            {items.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                className={`docs-toc-link ${activeHeading === heading.id ? 'docs-toc-link-active' : ''} ${heading.level === 3 ? 'docs-toc-link-nested' : ''}`}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
