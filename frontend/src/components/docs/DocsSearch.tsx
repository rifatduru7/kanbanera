import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocSearchEntry } from '../../lib/docs/types';
import { searchDocs } from '../../lib/docs/search';

interface DocsSearchProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (slug: string) => void;
}

export function DocsSearch({ language, value, onChange, onSelect }: DocsSearchProps) {
  const { t } = useTranslation();

  const results = useMemo(() => searchDocs(value, language).slice(0, 8), [language, value]);

  return (
    <div className="docs-search">
      <div className="docs-search-input-wrap">
        <MagnifyingGlass className="docs-search-icon size-4" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('docs.search_placeholder')}
          className="docs-search-input"
        />
        {value ? (
          <button type="button" onClick={() => onChange('')} className="docs-search-clear">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {value ? (
        <div className="docs-search-results">
          {results.length > 0 ? (
            results.map((result) => (
              <SearchResultItem key={result.id} result={result} onSelect={onSelect} />
            ))
          ) : (
            <div className="docs-search-empty">{t('docs.no_results')}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: DocSearchEntry;
  onSelect: (slug: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={() => onSelect(result.slug)} className="docs-search-result">
      <span className="docs-search-result-section">
        {t(`docs.sections.${result.section}`)}
      </span>
      <span className="docs-search-result-title">{result.title}</span>
      <span className="docs-search-result-description">{result.description}</span>
    </button>
  );
}
