import type { ReactNode } from 'react';

export function DocsCardGrid({ children }: { children: ReactNode }) {
  return <div className="docs-card-grid">{children}</div>;
}

export function DocsCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a href={href} className="docs-card">
      <span className="docs-card-title">{title}</span>
      <span className="docs-card-description">{description}</span>
    </a>
  );
}
