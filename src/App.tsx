import { useEffect, useMemo, useRef, useState } from 'react';
import { applyCatalogSupplements } from './catalog';
import { createWantedImages, downloadWantedImages } from './exporter';
import { prepareExportPages, wantedImageFilename } from './export-preparation';
import { aggregateMatches, cardVariantLabel, formatExportedWantedText, formatWantedText, matchCardList } from './matcher';
import { parseCardList } from './parser';
import type { Card, CardCatalog, ExportPreferences, GroupField, MatchResult, OutputStyle, SortField } from './types';

const SAMPLE = `1x Ferrous Forerunner
- Ashe, Focused 2x
1x Nasus, Ascended (AA)`;

const DEFAULT_CARD_LIMITS: Record<OutputStyle, number> = { grid: 12, list: 8, compact: 16 };
const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  style: 'grid',
  cardsPerImage: DEFAULT_CARD_LIMITS,
  sortBy: 'input',
  groupBy: 'none',
  includeText: true,
};
const EXPORT_PREFERENCES_KEY = 'riftlist-export-preferences';
const SORT_OPTIONS: Array<[SortField, string]> = [['input', 'Input order'], ['name', 'Name'], ['domain', 'Domain'], ['energy', 'Energy'], ['might', 'Might'], ['rarity', 'Rarity'], ['set', 'Set'], ['type', 'Type']];
const GROUP_OPTIONS: Array<[GroupField, string]> = [['none', 'No grouping'], ['domain', 'Domain'], ['set', 'Set'], ['rarity', 'Rarity'], ['type', 'Type']];

function loadPreference<T extends string>(key: string, fallback: T) {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadExportPreferences(): ExportPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPORT_PREFERENCES_KEY) ?? '{}') as Partial<ExportPreferences>;
    const style: OutputStyle = ['grid', 'list', 'compact'].includes(saved.style ?? '') ? saved.style as OutputStyle : DEFAULT_EXPORT_PREFERENCES.style;
    const sortBy: SortField = SORT_OPTIONS.some(([value]) => value === saved.sortBy) ? saved.sortBy as SortField : DEFAULT_EXPORT_PREFERENCES.sortBy;
    const groupBy: GroupField = GROUP_OPTIONS.some(([value]) => value === saved.groupBy) ? saved.groupBy as GroupField : DEFAULT_EXPORT_PREFERENCES.groupBy;
    const cardsPerImage = (Object.keys(DEFAULT_CARD_LIMITS) as OutputStyle[]).reduce((limits, layout) => {
      const value = saved.cardsPerImage?.[layout];
      limits[layout] = typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 24 ? value : DEFAULT_CARD_LIMITS[layout];
      return limits;
    }, {} as Record<OutputStyle, number>);
    return { style, cardsPerImage, sortBy, groupBy, includeText: typeof saved.includeText === 'boolean' ? saved.includeText : true };
  } catch {
    return { ...DEFAULT_EXPORT_PREFERENCES, cardsPerImage: { ...DEFAULT_CARD_LIMITS } };
  }
}

function formatCatalogDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function CardImage({ card, eager = false }: { card: Card; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imageSource = new URL(card.imagePath, document.baseURI).toString();
  return (
    <div className={`image-frame ${card.orientation} ${failed ? 'image-failed' : ''}`}>
      {!failed && (
        <img
          src={imageSource}
          alt={`${card.name}, ${card.publicCode}`}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
        />
      )}
      {failed && <span aria-hidden="true">RL</span>}
    </div>
  );
}

function ResultCard({ item, style, eager }: { item: ReturnType<typeof aggregateMatches>[number]; style: OutputStyle; eager: boolean }) {
  const variant = cardVariantLabel(item.card);
  return (
    <article className="result-card">
      <div className="art-wrap">
        <CardImage card={item.card} eager={eager} />
        <span className="quantity-badge">{item.quantity}×</span>
      </div>
      <div className="card-copy">
        <strong>{item.card.name}</strong>
        <span>{[item.card.publicCode, variant].filter(Boolean).join(' · ')}</span>
        {style !== 'grid' && <small>{item.card.setName} · {item.card.rarity}</small>}
        {item.fuzzySources.length > 0 && <em>Matched from “{item.fuzzySources[0]}”</em>}
      </div>
    </article>
  );
}

function UnmatchedNotice({ result, onSuggestion }: { result: MatchResult; onSuggestion: (result: MatchResult, card: Card) => void }) {
  return (
    <li>
      <div>
        <span className="warning-mark">!</span>
        <p><strong>{result.parsed.original}</strong><small>{result.message ?? 'No confident card match found.'}</small></p>
      </div>
      {result.suggestions.length > 0 && (
        <div className="suggestions">
          <span>Try:</span>
          {result.suggestions.map((card) => (
            <button type="button" key={card.id} onClick={() => onSuggestion(result, card)}>{card.name}</button>
          ))}
        </div>
      )}
    </li>
  );
}

export default function App() {
  const [input, setInput] = useState(() => loadPreference<string>('riftlist-input', SAMPLE));
  const [submitted, setSubmitted] = useState(() => loadPreference<string>('riftlist-input', SAMPLE));
  const [exportPreferences, setExportPreferences] = useState<ExportPreferences>(loadExportPreferences);
  const [catalog, setCatalog] = useState<CardCatalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const [clearedInput, setClearedInput] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const catalogUrl = new URL('data/cards.json', document.baseURI);
    fetch(catalogUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CardCatalog>;
      })
      .then((data) => setCatalog({ ...data, cards: applyCatalogSupplements(data.cards) }))
      .catch((error) => {
        console.error('Failed to load bundled card catalog', { url: catalogUrl.toString(), error });
        setCatalogError('The card catalog could not be loaded.');
      });

    const handleOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('riftlist-input', input); } catch { /* storage is optional */ }
  }, [input]);

  useEffect(() => {
    try { localStorage.setItem(EXPORT_PREFERENCES_KEY, JSON.stringify(exportPreferences)); } catch { /* storage is optional */ }
  }, [exportPreferences]);

  const parsedDraft = useMemo(() => parseCardList(input), [input]);
  const parsed = useMemo(() => parseCardList(submitted), [submitted]);
  const results = useMemo(() => catalog ? matchCardList(parsed, catalog.cards) : [], [catalog, parsed]);
  const wanted = useMemo(() => aggregateMatches(results), [results]);
  const unmatched = useMemo(() => results.filter((result) => !result.card), [results]);
  const fuzzyCount = results.filter((result) => result.kind === 'fuzzy').length;
  const totalCards = wanted.reduce((sum, item) => sum + item.quantity, 0);
  const plainText = useMemo(() => formatWantedText(wanted, unmatched), [wanted, unmatched]);
  const exportPages = useMemo(() => prepareExportPages(wanted, exportPreferences), [wanted, exportPreferences]);
  const shareText = useMemo(() => formatExportedWantedText(exportPages, unmatched), [exportPages, unmatched]);
  const activePage = exportPages[previewPage] ?? exportPages[0];
  const style = exportPreferences.style;
  const canNativeShare = typeof Reflect.get(navigator, 'share') === 'function';

  const announce = (message: string, duration = 2_600) => {
    window.clearTimeout(toastTimer.current);
    setClearedInput(null);
    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast('');
      setClearedInput(null);
    }, duration);
  };

  const clearInput = () => {
    if (!input) return;
    const previousInput = input;
    announce('List cleared', 5_000);
    setClearedInput(previousInput);
    setInput('');
  };

  const undoClear = () => {
    if (clearedInput === null) return;
    const previousInput = clearedInput;
    setInput(previousInput);
    announce('List restored');
  };

  const matchCards = () => {
    setSubmitted(input);
    if (window.matchMedia('(max-width: 900px)').matches) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }), 60);
    }
  };

  const updateExportPreferences = (updates: Partial<ExportPreferences>) => {
    setPreviewPage(0);
    setExportPreferences((current) => ({ ...current, ...updates }));
  };

  const updateCardLimit = (value: number) => {
    updateExportPreferences({ cardsPerImage: { ...exportPreferences.cardsPerImage, [style]: Math.max(1, Math.min(24, value || 1)) } });
  };

  const restoreExportDefaults = () => {
    setPreviewPage(0);
    setExportPreferences({ ...DEFAULT_EXPORT_PREFERENCES, cardsPerImage: { ...DEFAULT_CARD_LIMITS } });
    announce('Export settings restored');
  };

  const applySuggestion = (result: MatchResult, card: Card) => {
    const lines = input.split(/\r?\n/);
    const suffix = result.parsed.variant === 'alternate-art' ? ' (AA)'
      : result.parsed.variant === 'signed-showcase' ? ' (Sig)'
      : result.parsed.variant === 'overnumbered' ? ' (ON)' : '';
    lines[result.parsed.lineNumber - 1] = `${result.parsed.quantity}x ${card.name}${suffix}`;
    const updated = lines.join('\n');
    setInput(updated);
    setSubmitted(updated);
    announce(`Using ${card.name}`);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      announce('Wanted list copied');
    } catch {
      const field = document.createElement('textarea');
      field.value = plainText;
      document.body.append(field);
      field.select();
      document.execCommand('copy');
      field.remove();
      announce('Wanted list copied');
    }
  };

  const makeImage = async (share = false) => {
    if (!wanted.length) return;
    setExporting(true);
    try {
      const blobs = await createWantedImages(exportPages, style);
      const timestamp = Date.now();
      const files = blobs.map((blob, index) => new File([blob], wantedImageFilename(index, blobs.length), { type: 'image/png', lastModified: timestamp + index * 1_000 }));
      const nativeShare = Reflect.get(navigator, 'share') as ((data: ShareData) => Promise<void>) | undefined;
      const nativeCanShare = Reflect.get(navigator, 'canShare') as ((data: ShareData) => boolean) | undefined;
      if (share && nativeShare && (!nativeCanShare || nativeCanShare.call(navigator, { files }))) {
        await nativeShare.call(navigator, { files, title: 'Riftbound wanted list', ...(exportPreferences.includeText ? { text: shareText } : {}) });
        announce('Share sheet opened');
      } else {
        downloadWantedImages(blobs);
        announce(`${blobs.length} image${blobs.length === 1 ? '' : 's'} saved`);
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') announce('Image export failed. Try again');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="RiftList home">
          <span className="brand-mark">RL</span>
          <span>RIFT<span>LIST</span></span>
        </a>
        <span className={`status-pill ${!online ? 'offline' : ''}`} title={catalog ? `Catalog updated ${formatCatalogDate(catalog.generatedAt)}` : undefined}>
          {catalog ? `${catalog.cards.length.toLocaleString()} cards loaded${online ? '' : ' · offline'}` : catalogError ? 'Catalog unavailable' : 'Loading catalog'}
        </span>
      </header>

      <section className="workspace" aria-label="RiftList wanted list builder">
        <div className="editor-panel">
          <div className="eyebrow">Riftbound trade tool</div>
          <h1>Turn your wants into a shareable card sheet.</h1>
          <p className="intro">Paste whatever you have. Messy bullets, quantities, card IDs, and variant notes are welcome.</p>

          <label className="field-label" htmlFor="wanted-list">
            <span>Wanted cards</span>
            <small>{parsedDraft.length} {parsedDraft.length === 1 ? 'line' : 'lines'} found</small>
          </label>
          <textarea
            id="wanted-list"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') matchCards();
            }}
            aria-describedby="format-help"
            spellCheck="false"
            placeholder={'1x Ferrous Forerunner\n- Ashe, Focused 2x\n1x Nasus, Ascended (AA)'}
          />
          <div className="helper-row" id="format-help">
            <span>Formats: <code>2 Ahri, Alluring</code> · <code>Jinx (AA) 2</code> · <code>1x Annie</code></span>
            <button type="button" onClick={clearInput} disabled={!input}>Clear</button>
          </div>
          <button className="primary-button" type="button" onClick={matchCards} disabled={!catalog || !parsedDraft.length}>
            {catalog ? 'Match cards' : 'Loading cards…'} <span aria-hidden="true">→</span>
          </button>
          {catalogError && <p className="catalog-error" role="alert">{catalogError} Reload the page or reconnect to the internet. If the problem continues, report it.</p>}

          <details className="how-it-works">
            <summary><span>Accepted formats</span><small>AA, Sig, ON, card codes</small></summary>
            <div className="format-grid" aria-label="Supported list formats">
              <div><b>AA</b> Alternate art</div>
              <div><b>Sig</b> Signed Showcase</div>
              <div><b>ON</b> Overnumbered</div>
              <div><b>OGN-202</b> Card code</div>
            </div>
          </details>
        </div>

        <div className="preview-panel" ref={previewRef}>
          <div className="preview-toolbar">
            <div>
              <span className="eyebrow">Share preview</span>
              <strong>{totalCards} {totalCards === 1 ? 'card' : 'cards'} wanted</strong>
              {fuzzyCount > 0 && <small>{fuzzyCount} typo {fuzzyCount === 1 ? 'match' : 'matches'} reviewed</small>}
            </div>
            <div className="segmented" aria-label="Output style">
              {(['grid', 'list', 'compact'] as const).map((option) => (
                <button
                  type="button"
                  className={style === option ? 'active' : ''}
                  aria-pressed={style === option}
                  onClick={() => updateExportPreferences({ style: option })}
                  key={option}
                >{option[0].toUpperCase() + option.slice(1)}</button>
              ))}
            </div>
          </div>

          <details className="export-settings">
            <summary>
              <span>Customize export</span>
              <small>{exportPreferences.cardsPerImage[style]} per image · {SORT_OPTIONS.find(([value]) => value === exportPreferences.sortBy)?.[1]} · {exportPreferences.groupBy === 'none' ? 'No grouping' : `Group by ${GROUP_OPTIONS.find(([value]) => value === exportPreferences.groupBy)?.[1]}`} · Text {exportPreferences.includeText ? 'on' : 'off'}</small>
            </summary>
            <div className="export-settings-fields">
              <label>
                <span>Cards per image</span>
                <input type="number" min="1" max="24" value={exportPreferences.cardsPerImage[style]} onChange={(event) => updateCardLimit(event.target.valueAsNumber)} />
              </label>
              <label>
                <span>Sort by</span>
                <select value={exportPreferences.sortBy} onChange={(event) => updateExportPreferences({ sortBy: event.target.value as SortField })}>
                  {SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>Group by</span>
                <select value={exportPreferences.groupBy} onChange={(event) => updateExportPreferences({ groupBy: event.target.value as GroupField })}>
                  {GROUP_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="toggle-field">
                <input type="checkbox" checked={exportPreferences.includeText} onChange={(event) => updateExportPreferences({ includeText: event.target.checked })} />
                <span>Include text in share</span>
              </label>
              <button type="button" className="restore-settings" onClick={restoreExportDefaults}>Restore export defaults</button>
            </div>
          </details>

          <div className={`wanted-board board-${style}`} aria-live="polite" aria-busy={!catalog}>
            <div className="board-head">
              <div><span>WANTED</span><small>Riftbound trade list</small></div>
              {exportPages.length > 1 && <b>Page {Math.min(previewPage + 1, exportPages.length)} of {exportPages.length}</b>}
            </div>

            {activePage ? (
              <div className="result-grid">
                {activePage.items.map((item, index) => <ResultCard item={item} style={style} eager={index < 6} key={item.card.id} />)}
              </div>
            ) : (
              <div className="empty-board">
                <div className="empty-card-stack" aria-hidden="true"><span>RL</span></div>
                <strong>{catalog ? 'Your matched cards will land here.' : 'Loading the Riftbound catalog…'}</strong>
                <small>Paste one card per line, then tap Match cards.</small>
              </div>
            )}

            <footer><span>Made with RiftList</span></footer>
          </div>

          {exportPages.length > 1 && (
            <div className="page-navigation" aria-label="Export page preview">
              <button type="button" onClick={() => setPreviewPage((page) => Math.max(0, page - 1))} disabled={previewPage === 0}>Previous</button>
              <span>Page {previewPage + 1} of {exportPages.length}{activePage?.groupLabel ? ` · ${activePage.groupLabel}` : ''}</span>
              <button type="button" onClick={() => setPreviewPage((page) => Math.min(exportPages.length - 1, page + 1))} disabled={previewPage === exportPages.length - 1}>Next</button>
            </div>
          )}

          {unmatched.length > 0 && (
            <section className="unmatched-panel" aria-labelledby="unmatched-title">
              <div><span className="eyebrow">Needs a look</span><strong id="unmatched-title">{unmatched.length} unmatched {unmatched.length === 1 ? 'line' : 'lines'}</strong></div>
              <ul>{unmatched.map((result) => <UnmatchedNotice result={result} onSuggestion={applySuggestion} key={`${result.parsed.lineNumber}-${result.parsed.original}`} />)}</ul>
            </section>
          )}

          <div className={`preview-actions ${canNativeShare ? 'has-share' : ''}`}>
            <button type="button" onClick={copyText} disabled={!wanted.length}>Copy text</button>
            {canNativeShare && <button type="button" onClick={() => makeImage(true)} disabled={!wanted.length || exporting}>Share {exportPages.length === 1 ? 'image' : 'images'}</button>}
            <button className="download" type="button" onClick={() => makeImage(false)} disabled={!wanted.length || exporting}>
              {exporting ? `Building ${exportPages.length === 1 ? 'image' : 'images'}…` : `Save ${exportPages.length === 1 ? 'image' : 'images'}`}
            </button>
          </div>

          {wanted.length > 0 && (
            <details className="text-output">
              <summary><span>Plain-text version</span><small>Tap to preview</small></summary>
              <pre>{plainText}</pre>
              <button type="button" onClick={copyText}>Copy for WhatsApp</button>
            </details>
          )}

          <p className="source-note">
            Card data and lightweight art are bundled from Riot’s public gallery. Viewed assets stay available in your browser cache.
          </p>
        </div>
      </section>

      <div className={`toast ${toast ? 'show' : ''} ${clearedInput !== null ? 'has-action' : ''}`}>
        <span role="status" aria-live="polite" aria-atomic="true">{toast}</span>
        {clearedInput !== null && <button type="button" onClick={undoClear}>Undo</button>}
      </div>
    </main>
  );
}
