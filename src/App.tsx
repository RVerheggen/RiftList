import { useEffect, useMemo, useRef, useState } from 'react';
import { applyCatalogSupplements } from './catalog';
import { createWantedImage, downloadWantedImage } from './exporter';
import { aggregateMatches, cardVariantLabel, formatWantedText, matchCardList } from './matcher';
import { parseCardList } from './parser';
import type { Card, CardCatalog, MatchResult, OutputStyle } from './types';

const SAMPLE = `1x Ferrous Forerunner
- Ashe, Focused 2x
1x Nasus, Ascended (AA)`;

function loadPreference<T extends string>(key: string, fallback: T) {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
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
  const [style, setStyle] = useState<OutputStyle>(() => loadPreference<OutputStyle>('riftlist-style', 'grid'));
  const [catalog, setCatalog] = useState<CardCatalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
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
      .catch(() => setCatalogError('The bundled card catalog could not be loaded.'));

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
    try { localStorage.setItem('riftlist-style', style); } catch { /* storage is optional */ }
  }, [style]);

  const parsedDraft = useMemo(() => parseCardList(input), [input]);
  const parsed = useMemo(() => parseCardList(submitted), [submitted]);
  const results = useMemo(() => catalog ? matchCardList(parsed, catalog.cards) : [], [catalog, parsed]);
  const wanted = useMemo(() => aggregateMatches(results), [results]);
  const unmatched = useMemo(() => results.filter((result) => !result.card), [results]);
  const fuzzyCount = results.filter((result) => result.kind === 'fuzzy').length;
  const totalCards = wanted.reduce((sum, item) => sum + item.quantity, 0);
  const plainText = useMemo(() => formatWantedText(wanted, unmatched), [wanted, unmatched]);
  const canNativeShare = typeof Reflect.get(navigator, 'share') === 'function';

  const announce = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(''), 2_600);
  };

  const matchCards = () => {
    setSubmitted(input);
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
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
      const blob = await createWantedImage(wanted, style);
      const file = new File([blob], 'riftlist-wanted.png', { type: 'image/png' });
      const nativeShare = Reflect.get(navigator, 'share') as ((data: ShareData) => Promise<void>) | undefined;
      const nativeCanShare = Reflect.get(navigator, 'canShare') as ((data: ShareData) => boolean) | undefined;
      if (share && nativeShare && (!nativeCanShare || nativeCanShare.call(navigator, { files: [file] }))) {
        await nativeShare.call(navigator, { files: [file], title: 'My Riftbound wanted list', text: 'My Riftbound wanted list' });
        announce('Share sheet opened');
      } else {
        downloadWantedImage(blob);
        announce('PNG saved');
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
          <i />
          {catalog ? `${catalog.cards.length.toLocaleString()} cards · ${online ? 'ready' : 'offline'}` : catalogError ? 'Catalog unavailable' : 'Loading catalog'}
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
            spellCheck="false"
            placeholder={'1x Ferrous Forerunner\n- Ashe, Focused 2x\n1x Nasus, Ascended (AA)'}
          />
          <div className="helper-row">
            <span>Formats: <code>2 Ahri, Alluring</code> · <code>Jinx (AA) 2</code> · <code>1x Annie</code></span>
            <button type="button" onClick={() => setInput('')}>Clear</button>
          </div>
          <button className="primary-button" type="button" onClick={matchCards} disabled={!catalog || !parsedDraft.length}>
            {catalog ? 'Match cards' : 'Loading cards…'} <span aria-hidden="true">→</span>
          </button>
          {catalogError && <p className="catalog-error" role="alert">{catalogError} Reload the page or check that <code>public/data/cards.json</code> exists.</p>}

          <div className="how-it-works" aria-label="Supported list formats">
            <span>Accepted formats</span>
            <div><b>AA</b> Alternate art</div>
            <div><b>Sig</b> Signed Showcase</div>
            <div><b>ON</b> Overnumbered</div>
            <div><b>OGN-202</b> Card code</div>
          </div>
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
                  onClick={() => setStyle(option)}
                  key={option}
                >{option[0].toUpperCase() + option.slice(1)}</button>
              ))}
            </div>
          </div>

          <div className={`wanted-board board-${style}`} aria-live="polite" aria-busy={!catalog}>
            <div className="board-head">
              <div><span>WANTED</span><small>Riftbound trade list</small></div>
              <b>{wanted.length} unique</b>
            </div>

            {wanted.length > 0 ? (
              <div className="result-grid">
                {wanted.map((item, index) => <ResultCard item={item} style={style} eager={index < 6} key={item.card.id} />)}
              </div>
            ) : (
              <div className="empty-board">
                <div className="empty-card-stack" aria-hidden="true"><span>RL</span></div>
                <strong>{catalog ? 'Your matched cards will land here.' : 'Loading the Riftbound catalog…'}</strong>
                <small>Paste one card per line, then tap Match cards.</small>
              </div>
            )}

            <footer><span>Made with RiftList</span><span>{online ? 'Ready to trade' : 'Working offline'}</span></footer>
          </div>

          {unmatched.length > 0 && (
            <section className="unmatched-panel" aria-labelledby="unmatched-title">
              <div><span className="eyebrow">Needs a look</span><strong id="unmatched-title">{unmatched.length} unmatched {unmatched.length === 1 ? 'line' : 'lines'}</strong></div>
              <ul>{unmatched.map((result) => <UnmatchedNotice result={result} onSuggestion={applySuggestion} key={`${result.parsed.lineNumber}-${result.parsed.original}`} />)}</ul>
            </section>
          )}

          <div className={`preview-actions ${canNativeShare ? 'has-share' : ''}`}>
            <button type="button" onClick={copyText} disabled={!wanted.length}>Copy text</button>
            {canNativeShare && <button type="button" onClick={() => makeImage(true)} disabled={!wanted.length || exporting}>Share image</button>}
            <button className="download" type="button" onClick={() => makeImage(false)} disabled={!wanted.length || exporting}>
              {exporting ? 'Building PNG…' : 'Save PNG'}
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

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
