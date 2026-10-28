import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AU, BR, DE, GB, IE, IN, US } from 'country-flag-icons/react/3x2';
import cnnBrazil from './assets/example-cnn-brazil.jpg';
import cnnBrazilVideo from './assets/example-cnn-brazil.mp4';
import cnnGermany from './assets/example-cnn-germany.jpg';
import cnnUs from './assets/example-cnn-us.jpg';
import facebookBrazil from './assets/example-facebook-brazil.png';
import facebookGermany from './assets/example-facebook-germany.png';
import facebookUs from './assets/example-facebook-us.png';
import googleBrazil from './assets/example-google-brazil.png';
import googleGermany from './assets/example-google-germany.png';
import googleUs from './assets/example-google-us.png';
import './guide';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080';

type UrlResponse = {
  status: string;
  url: string;
  responseTimeMs?: number;
  screenshot?: string;
  video?: string;
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
  // A link to a video of the page scrolling top to bottom.
  video?: string;
};

type RegionResult =
  | { state: 'running'; startedAt: number }
  | { state: 'ok'; responseTimeMs?: number; screenshot?: string; video?: string }
  | { state: 'error'; error: string };

// Where a country's browsers run, as a dot on the world map. x and y are
// percentages of the map image, which spans latitudes 80°N to 56°S.
type Pin = { x: number; y: number };

type Region = { value: string; label: string; flag: React.ReactNode; pin?: Pin };

// Flags are SVGs because Windows has no flag emoji.
const COUNTRIES: Region[] = [
  // Pins sit on the cities the browsers run in: London, Northern Virginia,
  // Frankfurt, Sydney, Dublin, Mumbai and São Paulo.
  { value: 'uk', label: 'United Kingdom', flag: <GB className="flag" />, pin: { x: 49.97, y: 20.96 } },
  { value: 'us', label: 'United States', flag: <US className="flag" />, pin: { x: 28.47, y: 30.15 } },
  { value: 'germany', label: 'Germany', flag: <DE className="flag" />, pin: { x: 52.42, y: 21.99 } },
  { value: 'australia', label: 'Australia', flag: <AU className="flag" />, pin: { x: 92.0, y: 83.75 } },
  { value: 'ireland', label: 'Ireland', flag: <IE className="flag" />, pin: { x: 48.25, y: 19.63 } },
  { value: 'india', label: 'India', flag: <IN className="flag" />, pin: { x: 70.25, y: 44.78 } },
  { value: 'brazil', label: 'Brazil', flag: <BR className="flag" />, pin: { x: 37.06, y: 76.18 } },
];

const REGIONS: Region[] = [
  // The local option runs Chrome on the dev machine, so only offer it in dev.
  ...(import.meta.env.DEV ? [{ value: '', label: 'Local', flag: '💻' }] : []),
  ...COUNTRIES,
];

type Shot = { region: Region; screenshot: string; responseTimeMs?: number; video?: string };

type Example = { name: string; url: string; date: string; shots: Shot[] };

// The countries a first visit starts with, and the ones the examples show:
// the United States, Germany and Brazil.
const STARTING_COUNTRIES = [COUNTRIES[1], COUNTRIES[2], COUNTRIES[6]];

// One example per site, with a screenshot and a time for each starting
// country, and a scroll video for some.
function example(
  name: string,
  url: string,
  date: string,
  screenshots: string[],
  times: number[],
  videos: (string | undefined)[] = [],
): Example {
  return {
    name,
    url,
    date,
    shots: STARTING_COUNTRIES.map((region, index) => ({
      region,
      screenshot: screenshots[index],
      responseTimeMs: times[index],
      video: videos[index],
    })),
  };
}

// Real results from tests run on the given dates, shown until the visitor
// runs a test of their own. CNN comes first because its page scrolls, so its
// Brazil result shows off the scroll video; Facebook and Google fit on one
// screen.
const EXAMPLES: Example[] = [
  example('CNN', 'cnn.com', '28 October 2026', [cnnUs, cnnGermany, cnnBrazil], [3943, 5444, 2252], [undefined, undefined, cnnBrazilVideo]),
  example('Facebook', 'facebook.com', '13 October 2026', [facebookUs, facebookGermany, facebookBrazil], [995, 1617, 1041]),
  example('Google', 'google.com', '13 October 2026', [googleUs, googleGermany, googleBrazil], [1528, 1488, 1203]),
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

// Runs one test in one region, with a screenshot and, if asked for, a scroll
// video. Regional
// tests start a Fargate task and are polled; the local test returns its
// results directly.
async function runTest(url: string, region: string, video: boolean): Promise<RegionResult> {
  const response = await request(`${API_URL}/url`, "Couldn't start a browser here. Try again in a moment.", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, region, video }),
  });

  const data = (await response.json()) as UrlResponse;

  if (data.status === 'started' && data.testId) {
    const result = await pollResult(data.testId);
    if (result.status === 'ok') {
      return { state: 'ok', responseTimeMs: result.responseTimeMs, screenshot: result.screenshot, video: result.video };
    }
    return { state: 'error', error: describeSiteError(result.error) };
  }
  return { state: 'ok', responseTimeMs: data.responseTimeMs, screenshot: data.screenshot, video: data.video };
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

// The logo: a row of overlapping checkpoints like the ones on the map, each a
// country's flag in a circle on a stem above its city dot
const LOGO_REGIONS = ['us', 'germany', 'india', 'brazil'];

function Logo() {
  const regions = LOGO_REGIONS.flatMap((value) => REGIONS.filter((region) => region.value === value));
  const step = 15;
  return (
    <svg viewBox={`0 0 ${24 + step * (regions.length - 1)} 38`} className="h-10 w-auto shrink-0" aria-hidden>
      <defs>
        <clipPath id="logo-head">
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      {regions.map((region, index) => (
        <g key={region.value} transform={`translate(${index * step})`}>
          <path d="M12 22v11" stroke="#fff" strokeWidth="2" />
          <circle cx="12" cy="34" r="3" fill="#fff" />
          <g clipPath="url(#logo-head)">
            {React.cloneElement(region.flag as React.ReactElement<React.SVGProps<SVGSVGElement>>, {
              x: -2,
              y: 1,
              width: 28,
              height: 22,
              className: undefined,
              preserveAspectRatio: 'none',
            })}
          </g>
          <circle cx="12" cy="12" r="11" fill="none" stroke="#fff" strokeWidth="2" />
        </g>
      ))}
    </svg>
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

// The countries as a row of chips: pressing one adds its country to the test
// or takes it out.
function CountryChips({
  selected,
  onToggle,
  onSetAll,
  errorId,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  onSetAll: (values: string[]) => void;
  errorId?: string;
}) {
  const labelId = useId();
  const allSelected = REGIONS.every((region) => selected.includes(region.value));

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={errorId} className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1">
        <p id={labelId} className="text-sm font-semibold text-slate-800">
          Test from
        </p>
        <button
          type="button"
          onClick={() => onSetAll(allSelected ? [] : REGIONS.map((region) => region.value))}
          className="text-button rounded-full px-2.5 py-1 text-sm font-semibold"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {REGIONS.map((region) => {
          const checked = selected.includes(region.value);
          return (
            <button
              key={region.value}
              type="button"
              onClick={() => onToggle(region.value)}
              aria-pressed={checked}
              className={`country-chip ${checked ? 'is-checked' : ''}`}
            >
              <span aria-hidden>{region.flag}</span>
              {region.label}
              <span className="country-chip-mark" aria-hidden>
                <CheckIcon />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m2.5 6.5 2.4 2.4 4.6-5.4" />
    </svg>
  );
}

// The world map behind the hero, with a dot where each country's browsers
// run. A chosen country's dot is lit. It is only a picture: countries are
// picked with the chips.
function CountryMap({ selected }: { selected: string[] }) {
  return (
    <div className="world-map">
      <div className="world-map-image" />
      {REGIONS.map(
        (region) =>
          region.pin && (
            <span
              key={region.value}
              className={`map-dot ${selected.includes(region.value) ? 'is-checked' : ''}`}
              style={{ left: `${region.pin.x}%`, top: `${region.pin.y}%` }}
            />
          ),
      )}
    </div>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selected, setSelected] = useState<string[]>(() => STARTING_COUNTRIES.map((region) => region.value));
  const [testedUrl, setTestedUrl] = useState('');
  // A scroll video adds time and cost, so tests take a screenshot only unless
  // the visitor asks for one.
  const [recordVideo, setRecordVideo] = useState(false);
  const [testedVideo, setTestedVideo] = useState(false);
  const [results, setResults] = useState<Record<string, RegionResult>>({});
  // The enlarged view holds every shot of the test, so it can flip between
  // countries in place.
  const [zoomed, setZoomed] = useState<{ shots: Shot[]; index: number } | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const urlErrorId = useId();
  const countryErrorId = useId();

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

  async function runRegion(region: string, target: string, video: boolean) {
    setResult(region, { state: 'running', startedAt: Date.now() });
    try {
      setResult(region, await runTest(target, region, video));
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

  async function startTest(target: string, regions: string[], video: boolean) {
    setTestedUrl(target);
    setTestedVideo(video);
    setResults({});
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    await Promise.all(regions.map((region) => runRegion(region, target, video)));
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

    await startTest(
      target,
      REGIONS.filter((region) => selected.includes(region.value)).map((region) => region.value),
      recordVideo,
    );
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
      // A video can be missing even though one was asked for: recording is
      // skipped if it fails, and the screenshot still comes back.
      const hasVideo = resultRegions.some((region) => {
        const result = results[region.value];
        return result.state === 'ok' && result.video;
      });
      summary = hasVideo ? 'Select a result to watch its video' : 'Select a screenshot to enlarge it';
    }
  }

  const resultShots: Shot[] = [];
  for (const region of resultRegions) {
    const result = results[region.value];
    if (result.state === 'ok' && result.screenshot) {
      resultShots.push({ region, screenshot: result.screenshot, responseTimeMs: result.responseTimeMs, video: result.video });
    }
  }

  function zoom(shots: Shot[], shot: Shot) {
    setZoomed({ shots, index: Math.max(0, shots.findIndex((item) => item.region.value === shot.region.value)) });
  }

  const shown = EXAMPLES[exampleIndex];

  return (
    <main className="relative px-4 pb-12 pt-4 text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="glow glow-green" />
        <div className="glow glow-mint" />
        <div className="glow glow-lime" />
      </div>

      {/* A faded map behind the hero, with a lit dot for each chosen country.
          Countries are picked with the chips, so the map is only a picture. */}
      <div className="hero-map" aria-hidden>
        <CountryMap selected={selected} />
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center gap-2.5">
        <Logo />
        <p className="text-lg font-bold tracking-tight text-[#0D3233]">GlobalTest</p>
      </div>

      <div className="relative mx-auto mt-6 flex max-w-4xl flex-col items-center text-center sm:mt-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[#0D3233] sm:text-[36px] lg:whitespace-nowrap lg:text-[40px]">
          See how your site looks and loads in any country
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700 sm:text-lg">
          Real Chrome browsers open your site in the countries you pick. You get a screenshot and the load time
          from each one, and a video of the whole page if you want it.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full max-w-3xl flex-col items-center gap-4">
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
                {isSubmitting ? (
                  'Testing…'
                ) : (
                  <span>
                    Test
                    {/* The count only fits beside the address on wider screens. */}
                    {selected.length > 0 && (
                      <span className="hidden sm:inline">
                        {` ${selected.length} ${selected.length === 1 ? 'country' : 'countries'}`}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </label>
            {urlError && (
              <p id={urlErrorId} role="alert" className="mt-2 text-left text-sm font-medium text-rose-700">
                {urlError}
              </p>
            )}
          </div>

          <CountryChips
            selected={selected}
            onToggle={toggleRegion}
            onSetAll={setSelected}
            errorId={selected.length === 0 ? countryErrorId : undefined}
          />
          {selected.length === 0 && (
            <p id={countryErrorId} role="alert" className="text-sm font-medium text-rose-700">
              Pick at least one country.
            </p>
          )}

          <label className={`country-chip cursor-pointer ${recordVideo ? 'is-checked' : ''}`}>
            <input
              type="checkbox"
              checked={recordVideo}
              onChange={(event) => setRecordVideo(event.target.checked)}
              className="sr-only"
            />
            <PlayIcon />
            Also record a scroll video
            <span className="text-xs font-normal text-slate-600">About 10 s longer</span>
            <span className="country-chip-mark" aria-hidden>
              <CheckIcon />
            </span>
          </label>
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
          {/* Each test waits for a browser to start, so it takes longer than the time it reports. */}
          <p className="-mt-2 mb-4 text-xs text-slate-600">
            Times are how long the page took to load in each country. The test takes longer because a browser has to
            start there first.
          </p>
          <div className="results-grid">
            {resultRegions.map((region) => (
              <ResultCard
                key={region.value}
                region={region}
                result={results[region.value]}
                onRetry={() => runRegion(region.value, testedUrl, testedVideo)}
                onZoom={(shot) => zoom(resultShots, shot)}
              />
            ))}
          </div>
        </section>
      )}

      {resultRegions.length === 0 && (
        <section aria-labelledby="example-heading" className="relative mx-auto mt-14 w-full max-w-4xl">
          <div className="mb-5 flex flex-col items-center gap-2 text-center">
            <h2 id="example-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Here’s{' '}
              <select
                value={exampleIndex}
                onChange={(event) => setExampleIndex(Number(event.target.value))}
                aria-label="Example website"
                className="site-select"
              >
                {EXAMPLES.map((item, index) => (
                  <option key={item.url} value={index}>
                    {item.name}
                  </option>
                ))}
              </select>{' '}
              from around the world
            </h2>
            <p className="text-sm text-slate-700">
              Real results for {shown.url} from {shown.date}. Compare the language, the prices and the cookie
              banner in each country. Open one, then flip between countries with the arrows.
            </p>
            <button
              type="button"
              onClick={() => {
                const regions = shown.shots.map((shot) => shot.region.value);
                setUrl(shown.url);
                setUrlError('');
                setSelected(regions);
                startTest(`https://${shown.url}/`, regions, recordVideo);
              }}
              className="retry-button"
            >
              Run this test
            </button>
          </div>
          <div className="results-grid">
            {shown.shots.map((shot) => (
              <ResultCard
                key={shown.url + shot.region.value}
                region={shot.region}
                result={{ state: 'ok', responseTimeMs: shot.responseTimeMs, screenshot: shot.screenshot, video: shot.video }}
                onRetry={() => {}}
                onZoom={(shot) => zoom(shown.shots, shot)}
              />
            ))}
          </div>
        </section>
      )}

      {zoomed && <ScreenshotDialog shots={zoomed.shots} start={zoomed.index} onClose={() => setZoomed(null)} />}
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
  onZoom: (shot: Shot) => void;
}) {
  const { screenshot, responseTimeMs, video } = result.state === 'ok' ? result : {};

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
          (screenshot ? (
            <button
              type="button"
              onClick={() => onZoom({ region, screenshot, responseTimeMs, video })}
              aria-label={video ? `Watch the scroll video from ${region.label}` : `Enlarge screenshot from ${region.label}`}
              className="screenshot-button relative block size-full"
            >
              {/* A result with a video plays it in the card, muted and on a
                  loop, unless the visitor prefers less motion. */}
              {video && !REDUCE_MOTION ? (
                <video
                  ref={playMuted}
                  src={video}
                  poster={screenshot}
                  loop
                  playsInline
                  className="fade-in block size-full object-cover object-top"
                />
              ) : (
                <img src={screenshot} alt="" className="fade-in block size-full object-cover object-top" />
              )}
              {video && (
                <span className="video-tag" aria-hidden>
                  <PlayIcon />
                  Scroll video
                </span>
              )}
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

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Starts a video muted. The autoPlay attribute doesn't reliably start a
// React-rendered video, so videos start themselves here.
function playMuted(element: HTMLVideoElement | null) {
  if (element) {
    element.muted = true;
    element.play().catch(() => {});
  }
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z" />
    </svg>
  );
}

function ChevronIcon({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 ${flip ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

// The enlarged view of one shot. With several, the arrows (or the arrow keys)
// flip between countries in place, which is the easiest way to spot what
// differs between them.
function ScreenshotDialog({ shots, start, onClose }: { shots: Shot[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const { region, screenshot, responseTimeMs, video } = shots[index];
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A result with a video opens on the video: the visitor asked for it.
  const [showVideo, setShowVideo] = useState(Boolean(shots[start].video));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function step(by: number) {
    setIndex((current) => (current + by + shots.length) % shots.length);
  }

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
      // The video's own controls use the arrow keys to seek.
      onKeyDown={(event) => {
        if (shots.length > 1 && !(event.target instanceof HTMLVideoElement)) {
          if (event.key === 'ArrowLeft') {
            step(-1);
          } else if (event.key === 'ArrowRight') {
            step(1);
          }
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
          {shots.length > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => step(-1)} aria-label="Previous country" className="icon-button">
                <ChevronIcon />
              </button>
              <span className="text-xs tabular-nums text-slate-600">
                {index + 1} of {shots.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next country" className="icon-button">
                <ChevronIcon flip />
              </button>
            </div>
          )}
          <button type="button" onClick={() => dialogRef.current?.close()} className="retry-button">
            Close
          </button>
        </header>
        {video && (
          <div className="view-toggle mx-4 mb-3" role="group" aria-label="View">
            <button type="button" aria-pressed={!showVideo} onClick={() => setShowVideo(false)}>
              Screenshot
            </button>
            <button type="button" aria-pressed={showVideo} onClick={() => setShowVideo(true)}>
              Scroll video
            </button>
          </div>
        )}
        <div className="min-h-0 overflow-auto">
          {video && showVideo ? (
            // Only rendered once the video view is open, so nothing downloads
            // until someone asks to watch.
            <video
              ref={playMuted}
              src={video}
              poster={screenshot}
              controls
              playsInline
              aria-label={`Video of the page scrolling, from ${region.label}`}
              className="block w-full"
            />
          ) : (
            <img src={screenshot} alt={`Screenshot from ${region.label}`} className="block w-full" />
          )}
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
