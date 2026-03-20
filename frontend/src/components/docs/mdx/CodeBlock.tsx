import { Check, Copy } from '@phosphor-icons/react';
import { Children, isValidElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CodeBlockProps {
  children?: React.ReactNode;
}

export function CodeBlock({ children }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { code, language, rendered } = useMemo(() => {
    const child = Children.only(children);

    if (!isValidElement(child)) {
      return { code: '', language: '', rendered: children };
    }

    const props = child.props as { children?: string; className?: string };
    const className = props.className ?? '';
    const rawCode = typeof props.children === 'string' ? props.children.trimEnd() : '';
    const detectedLanguage = className.replace('language-', '');

    return {
      code: rawCode,
      language: detectedLanguage,
      rendered: child,
    };
  }, [children]);

  const handleCopy = async () => {
    if (!code) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="docs-codeblock">
      <div className="docs-codeblock-header">
        <span className="docs-codeblock-language">{language || 'code'}</span>
        <button type="button" onClick={handleCopy} className="docs-codeblock-copy">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          <span>{copied ? t('docs.copied') : t('docs.copy')}</span>
        </button>
      </div>
      <div className="docs-codeblock-body">
        {rendered}
      </div>
    </div>
  );
}

export function InlineCode({ children }: { children?: React.ReactNode }) {
  return <code className="docs-inline-code">{children}</code>;
}
