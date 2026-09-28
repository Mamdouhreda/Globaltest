import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

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
  | { state: 'running'; message: string }
  | { state: 'ok'; responseTimeMs?: number; screenshot?: string }
  | { state: 'error'; error: string };

async function pollResult(testId: string): Promise<ResultResponse> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`${API_URL}/result?id=${testId}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result = (await response.json()) as ResultResponse;
    if (result.status !== 'pending') {
      return result;
    }
  }
  throw new Error('Timed out waiting for the test result');
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080';

type Region = { value: string; label: string; flag: string };

const REGIONS: Region[] = [
  // The local option runs Chrome on the dev machine, so only offer it in dev.
  ...(import.meta.env.DEV ? [{ value: '', label: 'Local', flag: '💻' }] : []),
  { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'us', label: 'United States', flag: '🇺🇸' },
  { value: 'germany', label: 'Germany', flag: '🇩🇪' },
  { value: 'australia', label: 'Australia', flag: '🇦🇺' },
];

// Runs one test in one region. Regional tests start a Fargate task and are
// polled; the local test returns its screenshot directly.
async function runTest(url: string, region: string, onProgress: (message: string) => void): Promise<RegionResult> {
  const response = await fetch(`${API_URL}/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, region }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as UrlResponse;

  if (data.status === 'started' && data.testId) {
    onProgress('Browser running… usually under a minute');
    const result = await pollResult(data.testId);
    if (result.status === 'ok') {
      return { state: 'ok', responseTimeMs: result.responseTimeMs, screenshot: result.screenshot };
    }
    return { state: 'error', error: result.error ?? 'Unknown error' };
  }
  return { state: 'ok', responseTimeMs: data.responseTimeMs, screenshot: data.screenshot };
}

function Globe() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-[min(440px,100vw)] -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <div className="globe-halo absolute left-1/2 top-1/2 size-[min(520px,118vw)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="globe-float relative size-full">
        <div className="globe absolute inset-0 overflow-hidden rounded-full">
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
          <div className="absolute left-[20%] top-[19%] h-[13%] w-[21%] rounded-full bg-white/70 blur-md" />
          <div className="absolute left-[25.5%] top-[23%] h-[5%] w-[8.6%] rounded-full bg-white blur-[2px]" />
        </div>
      </div>
      <div className="globe-shadow absolute left-1/2 top-[calc(50%+min(250px,57vw))] h-9 w-[min(300px,68vw)] rounded-full" />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>(() => [REGIONS[0].value]);
  const [testedUrl, setTestedUrl] = useState('');
  const [results, setResults] = useState<Record<string, RegionResult>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isSubmitting = Object.values(results).some((result) => result.state === 'running');

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0 || isSubmitting) {
      return;
    }

    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const regions = REGIONS.filter((region) => selected.includes(region.value)).map((region) => region.value);
    setTestedUrl(target);
    setResults(Object.fromEntries(regions.map((region) => [region, { state: 'running', message: 'Starting browser…' }])));
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    await Promise.all(
      regions.map(async (region) => {
        try {
          const result = await runTest(target, region, (message) => setResult(region, { state: 'running', message }));
          setResult(region, result);
        } catch (error) {
          console.error(error);
          setResult(region, { state: 'error', error: 'Could not reach the test service' });
        }
      }),
    );
  }

  const resultRegions = REGIONS.filter((region) => region.value in results);

  return (
    <div className="hero-bg min-h-screen text-slate-800">
      {/* Top padding puts the search at the vertical center, where justify-center
          used to, so the hero stays put when results appear below it. */}
      <section className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-20 pt-[max(4rem,calc(50vh-95px))]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="glow glow-yellow" />
          <div className="glow glow-mint" />
          <div className="glow glow-peach" />
          <div className="glow glow-white" />
        </div>

        <div className="relative flex w-full max-w-[880px] justify-center">
          <Globe />

          <form onSubmit={handleSubmit} className="relative z-10 flex w-full flex-col items-center gap-6">
            <div className="glass-shell relative w-full rounded-[32px] p-3 sm:p-[22px]">
              <span className="glass-streak left-[28%] top-0 w-[34%]" aria-hidden />
              <span className="glass-streak bottom-0 left-[53%] w-[32%]" aria-hidden />
              <label className="glass-field flex h-16 items-center gap-4 rounded-[22px] px-5 sm:h-20 sm:px-7">
                <SearchIcon />
                <span className="sr-only">Website URL</span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="url"
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Paste a website to see it from anywhere…"
                  className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-500 sm:text-[22px]"
                />
                {url ? (
                  <button
                    type="submit"
                    disabled={isSubmitting || selected.length === 0}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Testing…' : 'Test'}
                  </button>
                ) : (
                  <span className="hidden shrink-0 items-center gap-1.5 text-[13px] font-medium text-slate-500 sm:flex" aria-hidden>
                    <kbd className="key">⌘</kbd>+<kbd className="key">K</kbd>
                  </span>
                )}
              </label>
            </div>
  
            <fieldset className="flex min-w-0 max-w-full flex-wrap justify-center gap-2.5">
              <legend className="sr-only">Countries to test from</legend>
              {REGIONS.map((region) => {
                const checked = selected.includes(region.value);
                return (
                  <label
                    key={region.value}
                    className={`country-chip flex cursor-pointer items-center gap-2 rounded-full py-2 pl-3 pr-4 text-sm font-medium transition ${checked ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRegion(region.value)}
                      className="size-4 accent-emerald-600"
                    />
                    <span aria-hidden>{region.flag}</span>
                    {region.label}
                  </label>
                );
              })}
            </fieldset>
            {selected.length === 0 && <p className="text-sm text-slate-600">Pick at least one country.</p>}
          </form>
        </div>

        {resultRegions.length > 0 && (
          <div ref={resultsRef} className="relative z-10 mt-40 w-full max-w-6xl scroll-mt-8">
            <h2 className="mb-6 text-center text-lg font-semibold text-slate-700">
              <span className="break-all">{testedUrl}</span> around the world
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {resultRegions.map((region) => (
                <ResultCard key={region.value} region={region} result={results[region.value]} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ResultCard({ region, result }: { region: Region; result: RegionResult }) {
  return (
    <article className="glass-card overflow-hidden rounded-3xl">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5 font-semibold">
          <span className="text-xl" aria-hidden>
            {region.flag}
          </span>
          {region.label}
        </div>
        {result.state === 'running' && <span className="status bg-amber-100 text-amber-800">Running</span>}
        {result.state === 'ok' && (
          <span className="status bg-emerald-100 text-emerald-800">
            {result.responseTimeMs !== undefined ? `${result.responseTimeMs} ms` : 'Loaded'}
          </span>
        )}
        {result.state === 'error' && <span className="status bg-rose-100 text-rose-800">Failed</span>}
      </header>
      <div className="aspect-[16/10] bg-white/50">
        {result.state === 'running' && (
          <div className="flex size-full animate-pulse items-center justify-center text-sm text-slate-500">
            {result.message}
          </div>
        )}
        {result.state === 'ok' &&
          (result.screenshot ? (
            <img
              src={result.screenshot}
              alt={`Screenshot from ${region.label}`}
              className="block size-full object-cover object-top"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-slate-500">No screenshot returned</div>
          ))}
        {result.state === 'error' && (
          <div className="flex size-full items-center justify-center px-6 text-center text-sm text-rose-700">
            {result.error}
          </div>
        )}
      </div>
    </article>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
