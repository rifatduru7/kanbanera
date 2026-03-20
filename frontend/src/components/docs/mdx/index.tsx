import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { Callout, InfoCallout, SuccessCallout, WarningCallout } from './Callout';
import { CodeBlock, InlineCode } from './CodeBlock';
import { DocsCard, DocsCardGrid } from './DocsCardGrid';
import { Steps } from './Steps';

export const docsMdxComponents: Record<string, ComponentType<any>> = {
  pre: CodeBlock,
  code: InlineCode,
  Callout,
  InfoCallout,
  WarningCallout,
  SuccessCallout,
  Steps,
  DocsCardGrid,
  DocsCard,
  a: (props) => {
    const href = props.href as string | undefined;
    if (href?.startsWith('/docs')) {
      return <NavLink {...props} to={href} />;
    }
    return <a {...props} />;
  },
};
