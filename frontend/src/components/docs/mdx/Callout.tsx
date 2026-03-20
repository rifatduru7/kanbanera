import type { ReactNode } from 'react';
import { Info, WarningCircle, CheckCircle } from '@phosphor-icons/react';

interface CalloutProps {
  children: ReactNode;
  title?: string;
}

function BaseCallout({
  children,
  title,
  icon,
  className,
}: CalloutProps & { icon: ReactNode; className: string }) {
  return (
    <div className={`docs-callout ${className}`}>
      <div className="docs-callout-icon">{icon}</div>
      <div className="min-w-0">
        {title ? <p className="docs-callout-title">{title}</p> : null}
        <div className="docs-callout-body">{children}</div>
      </div>
    </div>
  );
}

export function InfoCallout({ children, title = 'Info' }: CalloutProps) {
  return (
    <BaseCallout
      title={title}
      icon={<Info className="size-5" weight="duotone" />}
      className="docs-callout-info"
    >
      {children}
    </BaseCallout>
  );
}

export function WarningCallout({ children, title = 'Warning' }: CalloutProps) {
  return (
    <BaseCallout
      title={title}
      icon={<WarningCircle className="size-5" weight="duotone" />}
      className="docs-callout-warning"
    >
      {children}
    </BaseCallout>
  );
}

export function SuccessCallout({ children, title = 'Tip' }: CalloutProps) {
  return (
    <BaseCallout
      title={title}
      icon={<CheckCircle className="size-5" weight="duotone" />}
      className="docs-callout-success"
    >
      {children}
    </BaseCallout>
  );
}

export function Callout(props: CalloutProps) {
  return <InfoCallout {...props} />;
}
