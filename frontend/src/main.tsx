import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080';

type UrlResponse = {
  status: string;
  url: string;
  responseTimeMs?: number;
  screenshot?: string;
  // Set instead of screenshot when a region is selected: the test runs as a
  // Fargate task, which doesn't return a screenshot synchronously yet.
  taskArn?: string;
  testId?: string;
};

type ResultResponse = {
  status: 'pending' | 'ok' | 'error';
  responseTimeMs?: number;
  error?: string;
  screenshot?: string;
};

type RegionResult =
  | { state: 'running'; startedAt: number }
  | { state: 'ok'; responseTimeMs?: number; screenshot?: string }
  | { state: 'error'; error: string };

type Region = { value: string; label: string; flag: string };

const COUNTRIES: Region[] = [
  { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'us', label: 'United States', flag: '🇺🇸' },
  { value: 'germany', label: 'Germany', flag: '🇩🇪' },
  { value: 'australia', label: 'Australia', flag: '🇦🇺' },
  { value: 'ireland', label: 'Ireland', flag: '🇮🇪' },
  { value: 'uae', label: 'UAE', flag: '🇦🇪' },
  { value: 'india', label: 'India', flag: '🇮🇳' },
  { value: 'brazil', label: 'Brazil', flag: '🇧🇷' },
];

const REGIONS: Region[] = [
  // The local option runs Chrome on the dev machine, so only offer it in dev.
  ...(import.meta.env.DEV ? [{ value: '', label: 'Local', flag: '💻' }] : []),
  ...COUNTRIES,
];

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

// An error whose message is written for the user and safe to show as-is.
class TestError extends Error {}

async function request(input: string, failure: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new TestError("Couldn't reach the test service. Check your connection and try again.");
  }
  if (!response.ok) {
    console.error(await response.text());
    throw new TestError(failure);
  }
  return response;
}

async function pollResult(testId: string): Promise<ResultResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await request(`${API_URL}/result?id=${testId}`, 'Lost contact with the test. Try again.');
    const result = (await response.json()) as ResultResponse;
    if (result.status !== 'pending') {
      return result;
    }
  }
  throw new TestError('No result after 2 minutes. Try again.');
}

// Turns the browser's raw failure (a Chrome net:: error or a timeout) into a
// sentence that says what went wrong.
function describeSiteError(error: string | undefined): string {
  if (!error) {
    return "The site couldn't be loaded from here.";
  }
  if (error.includes('ERR_NAME_NOT_RESOLVED')) {
    return "This address doesn't exist. Check the spelling.";
  }
  if (/deadline exceeded|TIMED_OUT/.test(error)) {
    return 'The site took too long to respond from here.';
  }
  if (/ERR_CERT|ERR_SSL/.test(error)) {
    return "The site's security certificate was rejected.";
  }
  if (/ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE/.test(error)) {
    return 'The connection to the site failed from here.';
  }
  return "The site couldn't be loaded from here.";
}

// Runs one test in one region. Regional tests start a Fargate task and are
// polled; the local test returns its screenshot directly.
async function runTest(url: string, region: string): Promise<RegionResult> {
  const response = await request(`${API_URL}/url`, "Couldn't start a browser here. Try again in a moment.", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, region }),
  });

  const data = (await response.json()) as UrlResponse;

  if (data.status === 'started' && data.testId) {
    const result = await pollResult(data.testId);
    if (result.status === 'ok') {
      return { state: 'ok', responseTimeMs: result.responseTimeMs, screenshot: result.screenshot };
    }
    return { state: 'error', error: describeSiteError(result.error) };
  }
  return { state: 'ok', responseTimeMs: data.responseTimeMs, screenshot: data.screenshot };
}

// Returns the address as a full URL, or null if it isn't a usable website
// address.
function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    // A real hostname has a dot (example.com); localhost is for local testing.
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function formatTime(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

// A test reports nothing until it finishes, so the meter is an estimate: it
// eases towards full without reaching it, paced for a run of under a minute.
function estimateProgress(elapsedMs: number): number {
  return 0.95 * (1 - Math.exp(-elapsedMs / 25_000));
}

function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, now - startedAt);
}

function Globe() {
  return (
    <div className="globe-float size-20 sm:size-24" aria-hidden>
      <div className="globe relative size-full overflow-hidden rounded-full">
        <svg viewBox="0 0 440 440" className="absolute inset-0 size-full">
          <g fill="#43b865" stroke="#2f9a52" strokeWidth="2" strokeLinejoin="round">
            {/* Europe */}
            <path d="M170 70c18-10 40-14 58-8 14 5 20 16 34 14 16-2 30 4 44 14 10 7 26 8 34 18 6 8-2 18-12 20-14 3-28-2-40 6-10 7-8 20-20 24-14 5-26-6-40-4-12 2-20 14-34 12-12-2-14-16-26-20-12-4-26 4-34-6-6-8 4-18 10-26 8-10 14-20 26-28z" />
            {/* Africa */}
            <path d="M150 178c20-10 46-8 66-4 22 4 44 2 62 12 16 9 20 28 34 38 14 10 36 12 42 28 5 14-8 26-18 36-12 12-20 28-26 44-8 22-10 46-26 62-12 12-30 14-40 4-10-10-6-28-12-40-8-16-26-24-30-42-4-16 6-32 0-48-6-14-24-18-36-28-14-12-30-24-26-40 2-10 6-18 10-22z" />
            {/* Middle East */}
            <path d="M300 180c14-6 30-2 42 6 10 7 20 18 16 30-4 10-16 12-24 18-8 6-10 18-20 20-12 2-18-12-20-24-2-14-4-32 6-50z" />
            {/* Madagascar */}
            <path d="M326 330c6-4 12 0 12 8 0 10-4 22-10 26-6 3-10-4-9-12 1-8 2-18 7-22z" />
          </g>
        </svg>
        <div className="globe-shade absolute inset-0 rounded-full" />
        <div className="absolute left-[20%] top-[19%] h-[13%] w-[21%] rounded-full bg-white/70 blur-[3px]" />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selected, setSelected] = useState<string[]>(() => [REGIONS[0].value]);
  const [testedUrl, setTestedUrl] = useState('');
  const [results, setResults] = useState<Record<string, RegionResult>>({});
  const [zoomed, setZoomed] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const urlErrorId = useId();
  const countryErrorId = useId();

  const isSubmitting = Object.values(results).some((result) => result.state === 'running');
  const allSelected = selected.length === REGIONS.length;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function toggleRegion(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((region) => region !== value) : [...current, value],
    );
  }

  function setResult(region: string, result: RegionResult) {
    setResults((current) => ({ ...current, [region]: result }));
  }

  async function runRegion(region: string, target: string) {
    setResult(region, { state: 'running', startedAt: Date.now() });
    try {
      setResult(region, await runTest(target, region));
    } catch (error) {
      if (!(error instanceof TestError)) {
        console.error(error);
      }
      setResult(region, {
        state: 'error',
        error: error instanceof TestError ? error.message : 'Something went wrong. Try again.',
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const target = normalizeUrl(url);
    if (!target) {
      setUrlError('Enter a website address, like example.com');
      inputRef.current?.focus();
      return;
    }
    if (selected.length === 0) {
      return;
    }

    const regions = REGIONS.filter((region) => selected.includes(region.value)).map((region) => region.value);
    setTestedUrl(target);
    setResults({});
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    await Promise.all(regions.map((region) => runRegion(region, target)));
  }

  const resultRegions = REGIONS.filter((region) => region.value in results);
  const finished = resultRegions.filter((region) => results[region.value].state !== 'running').length;

  let fastest: { region: Region; ms: number } | undefined;
  for (const region of resultRegions) {
    const result = results[region.value];
    if (result.state === 'ok' && result.responseTimeMs !== undefined && (!fastest || result.responseTimeMs < fastest.ms)) {
      fastest = { region, ms: result.responseTimeMs };
    }
  }

  let summary = `${finished} of ${resultRegions.length} countries finished`;
  if (finished === resultRegions.length) {
    const loaded = resultRegions.filter((region) => results[region.value].state === 'ok').length;
    if (loaded === 0) {
      summary = "The site didn't load from any country";
    } else if (fastest && loaded > 1) {
      summary = `Fastest from ${fastest.region.label}: ${formatTime(fastest.ms)}`;
    } else {
      summary = 'Select a screenshot to enlarge it';
    }
  }

  const zoomedRegion = REGIONS.find((region) => region.value === zoomed);
  const zoomedResult = zoomed !== null ? results[zoomed] : undefined;

  return (
    <main className="hero-bg relative min-h-screen overflow-hidden px-4 pb-16 pt-[clamp(2rem,12vh,7rem)] text-slate-800">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="glow glow-yellow" />
        <div className="glow glow-mint" />
        <div className="glow glow-peach" />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <Globe />
        <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-emerald-800">GlobalTest</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          See your website from any country
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-700">
          A real Chrome browser opens your site in each country you pick and sends back a screenshot and the load
          time.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full flex-col items-center gap-4">
          <div className="w-full">
            <label className={`glass-field flex h-14 items-center gap-3 rounded-2xl pl-4 pr-2 sm:h-16 ${urlError ? 'is-invalid' : ''}`}>
              <SearchIcon />
              <span className="sr-only">Website address</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="url"
                autoFocus
                autoComplete="url"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="go"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setUrlError('');
                }}
                placeholder="example.com"
                aria-invalid={urlError ? true : undefined}
                aria-describedby={urlError ? urlErrorId : undefined}
                className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500 sm:text-lg"
              />
              <button type="submit" disabled={isSubmitting} className="primary-button">
                {isSubmitting && <span className="spinner" aria-hidden />}
                {isSubmitting ? 'Testing…' : 'Test'}
              </button>
            </label>
            {urlError && (
              <p id={urlErrorId} role="alert" className="mt-2 text-left text-sm font-medium text-rose-700">
                {urlError}
              </p>
            )}
          </div>

          <fieldset
            className="flex min-w-0 max-w-full flex-wrap justify-center gap-2"
            aria-describedby={selected.length === 0 ? countryErrorId : undefined}
          >
            <legend className="sr-only">Countries to test from</legend>
            {REGIONS.map((region) => {
              const checked = selected.includes(region.value);
              return (
                <label
                  key={region.value}
                  className={`country-chip flex cursor-pointer items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-sm font-medium ${checked ? 'is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRegion(region.value)}
                    className="size-4 accent-emerald-700"
                  />
                  <span aria-hidden>{region.flag}</span>
                  {region.label}
                </label>
              );
            })}
            <button
              type="button"
              onClick={() => setSelected(allSelected ? [] : REGIONS.map((region) => region.value))}
              className="text-button rounded-full px-3 py-1.5 text-sm font-semibold"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </fieldset>
          {selected.length === 0 && (
            <p id={countryErrorId} role="alert" className="text-sm font-medium text-rose-700">
              Pick at least one country.
            </p>
          )}
        </form>
      </div>

      {resultRegions.length > 0 && (
        <section ref={resultsRef} aria-labelledby="results-heading" className="relative mx-auto mt-10 w-full max-w-6xl scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="results-heading" className="min-w-0 text-lg font-semibold text-slate-900">
              Results for <span className="break-all">{testedUrl}</span>
            </h2>
            <p role="status" className="text-sm text-slate-700">
              {summary}
            </p>
          </div>
          <div className="results-grid">
            {resultRegions.map((region) => (
              <ResultCard
                key={region.value}
                region={region}
                result={results[region.value]}
                onRetry={() => runRegion(region.value, testedUrl)}
                onZoom={() => setZoomed(region.value)}
              />
            ))}
          </div>
        </section>
      )}

      {zoomedRegion && zoomedResult?.state === 'ok' && zoomedResult.screenshot && (
        <ScreenshotDialog
          region={zoomedRegion}
          screenshot={zoomedResult.screenshot}
          responseTimeMs={zoomedResult.responseTimeMs}
          onClose={() => setZoomed(null)}
        />
      )}
    </main>
  );
}

function RunningMeter({ region, startedAt }: { region: Region; startedAt: number }) {
  const elapsed = useElapsed(startedAt);
  const percent = Math.round(estimateProgress(elapsed) * 100);

  let stage = 'Starting a browser…';
  if (elapsed > 60_000) {
    stage = 'Taking longer than usual…';
  } else if (elapsed > 10_000) {
    stage = 'Capturing your site…';
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 px-4 py-3 text-center">
      <p className="text-xs font-semibold text-slate-800">{stage}</p>
      <div
        role="progressbar"
        aria-label={`Test progress in ${region.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="meter"
      >
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs tabular-nums text-slate-600">{Math.floor(elapsed / 1000)}s · usually under a minute</p>
    </div>
  );
}

function ResultCard({
  region,
  result,
  onRetry,
  onZoom,
}: {
  region: Region;
  result: RegionResult;
  onRetry: () => void;
  onZoom: () => void;
}) {
  return (
    <article className="glass-card overflow-hidden rounded-2xl">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
        <span aria-hidden>{region.flag}</span>
        <h3 className="min-w-0 flex-1 basis-20 truncate text-sm font-semibold text-slate-900">{region.label}</h3>
        {result.state === 'running' && <span className="status bg-amber-100 text-amber-900">Running</span>}
        {result.state === 'ok' && (
          <span className="status bg-emerald-100 text-emerald-900">
            {result.responseTimeMs !== undefined ? formatTime(result.responseTimeMs) : 'Loaded'}
          </span>
        )}
        {result.state === 'error' && <span className="status bg-rose-100 text-rose-900">Failed</span>}
      </header>
      <div className="result-body bg-white/50">
        {result.state === 'running' && <RunningMeter region={region} startedAt={result.startedAt} />}
        {result.state === 'ok' &&
          (result.screenshot ? (
            <button
              type="button"
              onClick={onZoom}
              aria-label={`Enlarge screenshot from ${region.label}`}
              className="screenshot-button block size-full"
            >
              <img src={result.screenshot} alt="" className="fade-in block size-full object-cover object-top" />
            </button>
          ) : (
            <div className="flex size-full items-center justify-center px-4 text-center text-xs text-slate-600">
              No screenshot returned
            </div>
          ))}
        {result.state === 'error' && (
          <div className="fade-in flex size-full flex-col items-center justify-center gap-2 px-4 py-3 text-center">
            <p className="text-xs font-medium text-rose-800">{result.error}</p>
            <button type="button" onClick={onRetry} className="retry-button">
              Retry
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ScreenshotDialog({
  region,
  screenshot,
  responseTimeMs,
  onClose,
}: {
  region: Region;
  screenshot: string;
  responseTimeMs?: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click that lands on the dialog itself is on the backdrop.
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dialogRef.current.close();
        }
      }}
      aria-label={`Screenshot from ${region.label}`}
      className="screenshot-dialog"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-center gap-3 px-4 py-3">
          <span aria-hidden>{region.flag}</span>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{region.label}</h2>
          {responseTimeMs !== undefined && (
            <span className="status bg-emerald-100 text-emerald-900">{formatTime(responseTimeMs)}</span>
          )}
          <button type="button" onClick={() => dialogRef.current?.close()} className="retry-button">
            Close
          </button>
        </header>
        <div className="min-h-0 overflow-auto">
          <img src={screenshot} alt={`Screenshot from ${region.label}`} className="block w-full" />
        </div>
      </div>
    </dialog>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
