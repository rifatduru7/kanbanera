declare module '*.mdx' {
  import type { ComponentType } from 'react';

  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}

declare module 'virtual:docs-manifest' {
  const manifest: Record<string, string>;
  export default manifest;
}
