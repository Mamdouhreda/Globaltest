import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AE, AU, BH, BR, CA, CH, DE, ES, FR, GB, HK, ID, IE, IN, IT, JP, KR, MX, MY, NZ, SE, SG, TH, TW, US, ZA } from 'country-flag-icons/react/3x2';
import facebookBrazil from './assets/example-facebook-brazil.png';
import facebookGermany from './assets/example-facebook-germany.png';
import facebookIndia from './assets/example-facebook-india.png';
import facebookUs from './assets/example-facebook-us.png';
import msnBrazil from './assets/example-msn-brazil.png';
import msnBrazilVideo from './assets/example-msn-brazil.mp4';
import msnGermany from './assets/example-msn-germany.png';
import msnGermanyVideo from './assets/example-msn-germany.mp4';
import msnIndia from './assets/example-msn-india.png';
import msnIndiaVideo from './assets/example-msn-india.mp4';
import msnUs from './assets/example-msn-us.png';
import msnUsVideo from './assets/example-msn-us.mp4';
import yahooBrazil from './assets/example-yahoo-brazil.png';
import yahooBrazilVideo from './assets/example-yahoo-brazil.mp4';
import yahooGermany from './assets/example-yahoo-germany.png';
import yahooGermanyVideo from './assets/example-yahoo-germany.mp4';
import yahooIndia from './assets/example-yahoo-india.png';
import yahooIndiaVideo from './assets/example-yahoo-india.mp4';
import yahooUs from './assets/example-yahoo-us.png';
import yahooUsVideo from './assets/example-yahoo-us.mp4';
import './guide';
import { Logo } from './logo';
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

// soon marks a country with an AWS region but no browsers deployed yet: it is
// shown but can't be picked. Take it off once the region is live (see
// "Structure" in terraform/README.md for what a new region needs).
type Region = { value: string; label: string; flag: React.ReactNode; area: string; keywords?: string; pin?: Pin; soon?: boolean };

// Flags are SVGs because Windows has no flag emoji.
const COUNTRIES: Region[] = [
  // Pins sit on the cities the browsers run in: London, Northern Virginia,
  // Frankfurt, Sydney, Dublin, Mumbai and São Paulo.
  { value: 'uk', label: 'United Kingdom', flag: <GB className="flag" />, area: 'Europe', keywords: 'Britain England', pin: { x: 49.97, y: 20.96 } },
  { value: 'us', label: 'United States', flag: <US className="flag" />, area: 'Americas', keywords: 'USA America', pin: { x: 28.47, y: 30.15 } },
  { value: 'germany', label: 'Germany', flag: <DE className="flag" />, area: 'Europe', pin: { x: 52.42, y: 21.99 } },
  { value: 'australia', label: 'Australia', flag: <AU className="flag" />, area: 'Asia Pacific', pin: { x: 92.0, y: 83.75 } },
  { value: 'ireland', label: 'Ireland', flag: <IE className="flag" />, area: 'Europe', pin: { x: 48.25, y: 19.63 } },
  { value: 'india', label: 'India', flag: <IN className="flag" />, area: 'Asia Pacific', pin: { x: 70.25, y: 44.78 } },
  { value: 'brazil', label: 'Brazil', flag: <BR className="flag" />, area: 'Americas', pin: { x: 37.06, y: 76.18 } },
  // More countries with an AWS region, on the region's city or, where
  // AWS names only the country, its largest city.
  { value: 'bahrain', label: 'Bahrain', flag: <BH className="flag" />, area: 'Middle East and Africa', pin: { x: 64.04, y: 39.65 }, soon: true },
  { value: 'canada', label: 'Canada', flag: <CA className="flag" />, area: 'Americas', pin: { x: 29.56, y: 25.37 }, soon: true },
  { value: 'france', label: 'France', flag: <FR className="flag" />, area: 'Europe', pin: { x: 50.65, y: 22.9 }, soon: true },
  { value: 'hongkong', label: 'Hong Kong', flag: <HK className="flag" />, area: 'Asia Pacific', pin: { x: 81.71, y: 42.41 }, soon: true },
  { value: 'indonesia', label: 'Indonesia', flag: <ID className="flag" />, area: 'Asia Pacific', pin: { x: 79.68, y: 63.39 }, soon: true },
  { value: 'italy', label: 'Italy', flag: <IT className="flag" />, area: 'Europe', pin: { x: 52.55, y: 25.4 }, soon: true },
  { value: 'japan', label: 'Japan', flag: <JP className="flag" />, area: 'Asia Pacific', pin: { x: 88.8, y: 32.59 }, soon: true },
  { value: 'malaysia', label: 'Malaysia', flag: <MY className="flag" />, area: 'Asia Pacific', pin: { x: 78.25, y: 56.51 }, soon: true },
  { value: 'mexico', label: 'Mexico', flag: <MX className="flag" />, area: 'Americas', pin: { x: 22.11, y: 43.68 }, soon: true },
  { value: 'newzealand', label: 'New Zealand', flag: <NZ className="flag" />, area: 'Asia Pacific', pin: { x: 98.54, y: 85.93 }, soon: true },
  { value: 'singapore', label: 'Singapore', flag: <SG className="flag" />, area: 'Asia Pacific', pin: { x: 78.84, y: 57.83 }, soon: true },
  { value: 'southafrica', label: 'South Africa', flag: <ZA className="flag" />, area: 'Middle East and Africa', pin: { x: 55.12, y: 83.76 }, soon: true },
  { value: 'southkorea', label: 'South Korea', flag: <KR className="flag" />, area: 'Asia Pacific', pin: { x: 85.27, y: 31.2 }, soon: true },
  { value: 'spain', label: 'Spain', flag: <ES className="flag" />, area: 'Europe', pin: { x: 49.76, y: 28.2 }, soon: true },
  { value: 'sweden', label: 'Sweden', flag: <SE className="flag" />, area: 'Europe', pin: { x: 55.02, y: 15.2 }, soon: true },
  { value: 'switzerland', label: 'Switzerland', flag: <CH className="flag" />, area: 'Europe', pin: { x: 52.37, y: 23.99 }, soon: true },
  { value: 'taiwan', label: 'Taiwan', flag: <TW className="flag" />, area: 'Asia Pacific', pin: { x: 83.77, y: 40.42 }, soon: true },
  { value: 'thailand', label: 'Thailand', flag: <TH className="flag" />, area: 'Asia Pacific', pin: { x: 77.92, y: 48.71 }, soon: true },
  { value: 'uae', label: 'United Arab Emirates', flag: <AE className="flag" />, area: 'Middle East and Africa', pin: { x: 65.35, y: 40.29 }, soon: true },
];

const REGIONS: Region[] = [
  // The local option runs Chrome on the dev machine, so only offer it in dev.
  ...(import.meta.env.DEV ? [{ value: '', label: 'Local', flag: '💻', area: 'This computer' }] : []),
  ...COUNTRIES,
];

// The continents in the country picker, in the order it lists them.
const AREAS = ['This computer', 'Americas', 'Europe', 'Asia Pacific', 'Middle East and Africa'];

type Shot = { region: Region; screenshot: string; responseTimeMs?: number; video?: string };

type Example = { name: string; url: string; date: string; shots: Shot[] };

// The countries the examples show: the United States, Brazil, Germany and India.
const EXAMPLE_COUNTRIES = [COUNTRIES[1], COUNTRIES[6], COUNTRIES[2], COUNTRIES[5]];

// The countries a first visit starts with: one each in North America, Europe
// and Asia, kept few because every country is a browser to pay for.
const STARTING_COUNTRIES = ['us', 'germany', 'india'];

// One example per site, with a screenshot and a time for each example
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
    shots: EXAMPLE_COUNTRIES.map((region, index) => ({
      region,
      screenshot: screenshots[index],
      responseTimeMs: times[index],
      video: videos[index],
    })),
  };
}

// Real results from tests run on the given dates, shown until the visitor
// runs a test of their own, in the order of EXAMPLE_COUNTRIES. MSN and Yahoo
// change language and news by country and their pages scroll, so every
// result has a scroll video; Facebook fits on one screen.
const EXAMPLES: Example[] = [
  example('Yahoo', 'yahoo.com', '4 November 2026', [yahooUs, yahooBrazil, yahooGermany, yahooIndia], [1361, 4418, 2113, 2343], [yahooUsVideo, yahooBrazilVideo, yahooGermanyVideo, yahooIndiaVideo]),
  example('Facebook', 'facebook.com', '4 November 2026', [facebookUs, facebookBrazil, facebookGermany, facebookIndia], [1364, 1687, 1035, 2730]),
  example('MSN', 'msn.com', '4 November 2026', [msnUs, msnBrazil, msnGermany, msnIndia], [6903, 1527, 1233, 1241], [msnUsVideo, msnBrazilVideo, msnGermanyVideo, msnIndiaVideo]),
];

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

// An error whose message is written for the user and safe to show as-is.
class TestError extends Error {}

// `rejected`, if given, is the message for a 400: the service refused the
// request itself, so trying again won't help.
async function request(input: string, failure: string, init?: RequestInit, rejected?: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new TestError("Couldn't reach the test service. Check your connection and try again.");
  }
  if (response.status === 400 && rejected) {
    throw new TestError(rejected);
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
  if (/ERR_NAME_NOT_RESOLVED|no such host/.test(error)) {
    return "This address doesn't exist. Check the spelling.";
  }
  if (error.includes('not a public internet address')) {
    return 'Only public websites can be tested.';
  }
  if (/deadline exceeded|TIMED_OUT/.test(error)) {
    return 'The site took too long to respond from here.';
  }
  if (/ERR_CERT|ERR_SSL/.test(error)) {
    return "The site's security certificate was rejected.";
  }
  if (/ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE|ERR_TUNNEL_CONNECTION_FAILED|ERR_EMPTY_RESPONSE/.test(error)) {
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
  }, 'Only public websites can be tested.');

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

// The countries whose flags make up the logo
const LOGO_REGIONS = ['us', 'germany', 'india', 'brazil'];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// What the closed picker says: the first countries by name, then how many more.
function describeCountries(chosen: Region[], total: number): string {
  if (chosen.length === 0) {
    return 'Choose countries';
  }
  if (chosen.length === total) {
    return `All ${total} countries`;
  }
  const names = chosen.slice(0, 2).map((region) => region.label).join(', ');
  return chosen.length > 2 ? `${names} +${chosen.length - 2} more` : names;
}

// The countries as a dropdown: a line with the chosen flags that opens a list
// to search, grouped by continent, under a map that lights up as they're
// picked. On a phone the list is a sheet from the bottom of the screen.
function CountryPicker({
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
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const available = REGIONS.filter((region) => !region.soon);
  const chosen = available.filter((region) => selected.includes(region.value));
  const allSelected = chosen.length === available.length;

  const needle = query.trim().toLowerCase();
  const matching = REGIONS.filter((region) =>
    `${region.label} ${region.value} ${region.keywords ?? ''}`.toLowerCase().includes(needle),
  );

  function close(returnFocus = false) {
    setOpen(false);
    setQuery('');
    setPreview(undefined);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    // On a phone the keyboard would cover the list, so only wider screens
    // start in the search box.
    if (window.matchMedia('(min-width: 640px)').matches) {
      searchRef.current?.focus();
      panelRef.current?.scrollIntoView({ block: 'nearest' });
    }
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <p id={labelId} className="text-sm font-semibold text-slate-800">
        Test from
      </p>
      <div
        ref={rootRef}
        className="picker"
        onKeyDown={(event) => {
          if (open && event.key === 'Escape') {
            close(true);
          }
        }}
        onBlur={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
            close();
          }
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-controls={panelId}
          aria-labelledby={`${labelId} ${panelId}-summary`}
          aria-describedby={errorId}
          className={`picker-trigger ${open ? 'is-open' : ''}`}
        >
          {chosen.length > 0 && (
            <span className="picker-flags" aria-hidden>
              {chosen.slice(0, 4).map((region) => (
                <span key={region.value} className="picker-flag">
                  {region.flag}
                </span>
              ))}
            </span>
          )}
          <span id={`${panelId}-summary`} className="min-w-0 flex-1 truncate text-left">
            {describeCountries(chosen, available.length)}
          </span>
          <svg viewBox="0 0 24 24" className="picker-chevron size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open && <div className="picker-backdrop" aria-hidden />}

        <div ref={panelRef} id={panelId} role="group" aria-labelledby={labelId} hidden={!open} className="picker-panel">
          <div className="picker-map" aria-hidden>
            <CountryMap selected={selected} preview={preview} />
          </div>

          <div className="picker-search">
            <SearchIcon />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Enter picks the first match and is ready for the next one,
                // instead of submitting the test.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const first = matching.find((region) => !region.soon);
                  if (needle && first) {
                    onToggle(first.value);
                    setQuery('');
                  }
                }
              }}
              placeholder="Search countries"
              aria-label="Search countries"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500 sm:text-sm"
            />
          </div>

          <div className="picker-list">
            {matching.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-600">No country matches “{query.trim()}”.</p>}
            {AREAS.map((area) => {
              const regions = matching
                .filter((region) => region.area === area)
                // Countries ready to test come first, then A to Z.
                .sort((a, b) => Number(!!a.soon) - Number(!!b.soon) || a.label.localeCompare(b.label));
              if (regions.length === 0) {
                return null;
              }
              const ready = regions.filter((region) => !region.soon).map((region) => region.value);
              const allReady = ready.every((value) => selected.includes(value));
              return (
                <div key={area} role="group" aria-label={area} className="picker-area">
                  <div className="picker-area-heading">
                    <p>{area}</p>
                    {!needle && ready.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onSetAll(
                            allReady
                              ? selected.filter((value) => !ready.includes(value))
                              : [...new Set([...selected, ...ready])],
                          )
                        }
                        aria-label={`${allReady ? 'Clear' : 'Select'} all in ${area}`}
                        className="text-button rounded-full px-2 py-0.5 text-xs font-semibold"
                      >
                        {allReady ? 'Clear' : 'Select all'}
                      </button>
                    )}
                  </div>
                  <div className="picker-rows">
                    {regions.map((region) => {
                      const checked = selected.includes(region.value);
                      return (
                        <label
                          key={region.value}
                          onMouseEnter={() => setPreview(region.value)}
                          onMouseLeave={() => setPreview(undefined)}
                          onFocus={() => setPreview(region.value)}
                          className={`picker-row ${checked ? 'is-checked' : ''} ${region.soon ? 'is-soon' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={region.soon}
                            onChange={() => onToggle(region.value)}
                            className="sr-only"
                          />
                          <span aria-hidden>{region.flag}</span>
                          <span className="min-w-0 flex-1 truncate">{region.label}</span>
                          {region.soon ? (
                            <span className="picker-soon">Soon</span>
                          ) : (
                            <span className="country-chip-mark" aria-hidden>
                              <CheckIcon />
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="picker-footer">
            <button
              type="button"
              onClick={() => onSetAll(allSelected ? [] : available.map((region) => region.value))}
              className="text-button rounded-full px-2.5 py-1 text-sm font-semibold"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
            <p role="status" className="ml-auto text-sm text-slate-700">
              {chosen.length} selected
            </p>
            <button type="button" onClick={() => close(true)} className="picker-done">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// What each test captures: a screenshot, or a screenshot and a scroll video.
// The two are radios dressed as chips.
function CaptureChoice({ recordVideo, onChange }: { recordVideo: boolean; onChange: (recordVideo: boolean) => void }) {
  const labelId = useId();
  const name = useId();
  const options = [
    { video: false, label: 'Screenshot', icon: <ImageIcon /> },
    { video: true, label: 'Screenshot and video', icon: <PlayIcon />, note: 'About 10 s longer' },
  ];

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col items-center gap-2.5">
      <p id={labelId} className="text-sm font-semibold text-slate-800">
        Capture
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {options.map((option) => {
          const checked = recordVideo === option.video;
          return (
            <label key={option.label} className={`country-chip cursor-pointer ${checked ? 'is-checked' : ''}`}>
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option.video)}
                className="sr-only"
              />
              {option.icon}
              {option.label}
              {option.note && <span className="text-xs font-normal text-slate-600">{option.note}</span>}
              <span className="country-chip-mark" aria-hidden>
                <CheckIcon />
              </span>
            </label>
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
// picked with the picker. preview marks the country being pointed at there,
// even one with no browsers yet.
function CountryMap({ selected, preview }: { selected: string[]; preview?: string }) {
  return (
    <div className="world-map">
      <div className="world-map-image" />
      {REGIONS.map(
        (region) =>
          region.pin &&
          (!region.soon || region.value === preview) && (
            <span
              key={region.value}
              className={`map-dot ${selected.includes(region.value) ? 'is-checked' : ''} ${region.value === preview ? 'is-preview' : ''}`}
              style={{ left: `${region.pin.x}%`, top: `${region.pin.y}%` }}
            />
          ),
      )}
    </div>
  );
}

// How long an example shows each country before moving to the next.
const SHOWCASE_MS = 6000;

// A browser window playing one real example, moving through its countries to
// show the same address giving a different page in each. A visitor can pick a
// country, pause, or open the page larger, which holds it on that country. With
// reduced motion it starts paused, on the screenshot.
function ExampleShowcase({
  example,
  hold,
  onZoom,
}: {
  example: Example;
  hold: boolean;
  onZoom: (shot: Shot, showVideo: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(REDUCE_MOTION);
  const shot = example.shots[index];
  const playing = Boolean(shot.video && !paused);

  useEffect(() => {
    if (paused || hold) {
      return;
    }
    const timer = window.setTimeout(() => setIndex((index + 1) % example.shots.length), SHOWCASE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, hold, example.shots.length]);

  return (
    <figure className="showcase">
      <div className="showcase-window">
        <div className="showcase-bar">
          <span className="showcase-lights" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="showcase-address">{example.url}</span>
        </div>
        <div className="showcase-screen">
          <button
            type="button"
            onClick={() => onZoom(shot, playing)}
            aria-label={`Enlarge ${example.url} from ${shot.region.label}`}
            className="block size-full cursor-zoom-in"
          >
            {playing ? (
              <video
                key={shot.region.value}
                ref={playMuted}
                src={shot.video}
                poster={shot.screenshot}
                loop
                playsInline
                className="fade-in block size-full object-cover object-top"
              />
            ) : (
              <img key={shot.region.value} src={shot.screenshot} alt="" className="fade-in block size-full object-cover object-top" />
            )}
          </button>
          <p className="showcase-badge">
            <span aria-hidden>{shot.region.flag}</span>
            <span>
              <strong>Seen from {shot.region.label}</strong>
              {shot.responseTimeMs !== undefined && <span className="block">Loaded in {formatTime(shot.responseTimeMs)}</span>}
            </span>
          </p>
        </div>
      </div>
      <div className="showcase-tabs">
        {example.shots.map((item, itemIndex) => (
          <button
            key={item.region.value}
            type="button"
            onClick={() => setIndex(itemIndex)}
            aria-pressed={itemIndex === index}
            aria-label={`Show ${example.url} from ${item.region.label}`}
            className={`showcase-tab ${itemIndex === index ? 'is-active' : ''} ${paused ? 'is-paused' : ''}`}
            style={{ '--showcase-ms': `${SHOWCASE_MS}ms` } as React.CSSProperties}
          >
            <span aria-hidden>{item.region.flag}</span>
            <span className="hidden sm:inline">{item.region.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? 'Play the example' : 'Pause the example'}
          className="showcase-pause"
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>
    </figure>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M4.5 3h2.2v10H4.5zM9.3 3h2.2v10H9.3z" />
    </svg>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selected, setSelected] = useState<string[]>(STARTING_COUNTRIES);
  const [testedUrl, setTestedUrl] = useState('');
  // A scroll video adds time and cost, so tests take a screenshot only unless
  // the visitor asks for one.
  const [recordVideo, setRecordVideo] = useState(false);
  const [testedVideo, setTestedVideo] = useState(false);
  const [results, setResults] = useState<Record<string, RegionResult>>({});
  // The enlarged view holds every shot of the test, so it can flip between
  // countries in place.
  const [zoomed, setZoomed] = useState<{ shots: Shot[]; index: number; showVideo: boolean } | null>(null);
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

  function zoom(shots: Shot[], shot: Shot, showVideo: boolean) {
    setZoomed({ shots, index: Math.max(0, shots.findIndex((item) => item.region.value === shot.region.value)), showVideo });
  }

  const shown = EXAMPLES[exampleIndex];

  return (
    <main className="relative px-4 pb-12 pt-4 text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="glow glow-red" />
        <div className="glow glow-rose" />
        <div className="glow glow-peach" />
      </div>

      {/* A faded map behind the hero, with a lit dot for each chosen country.
          Countries are picked with the picker, so the map is only a picture. */}
      <div className="hero-map" aria-hidden>
        <CountryMap selected={selected} />
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center gap-2.5">
        <Logo flags={LOGO_REGIONS.flatMap((value) => REGIONS.filter((region) => region.value === value).map((region) => region.flag))} />
        <p className="text-lg font-bold tracking-tight text-[#3a1408]">GlobalTest</p>
      </div>

      <div className="relative mx-auto mt-6 flex max-w-4xl flex-col items-center text-center sm:mt-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[#3a1408] sm:text-[36px] lg:whitespace-nowrap lg:text-[40px]">
          See your website from any location
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

          <CountryPicker
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

          <CaptureChoice recordVideo={recordVideo} onChange={setRecordVideo} />
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
                onZoom={(shot, showVideo) => zoom(resultShots, shot, showVideo)}
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
              <span className="site-select-wrap">
                <span className="site-select-sizer" aria-hidden>
                  {shown.name}
                </span>
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
                </select>
              </span>{' '}
              from around the world
            </h2>
            <p className="text-sm text-slate-700">
              Real results for {shown.url} from {shown.date}. Compare the language, the news and the cookie
              banner in each country. Select the page to see it larger.
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
          <ExampleShowcase key={shown.url} example={shown} hold={zoomed !== null} onZoom={(shot, showVideo) => zoom(shown.shots, shot, showVideo)} />
        </section>
      )}

      {zoomed && (
        <ScreenshotDialog
          shots={zoomed.shots}
          start={zoomed.index}
          startOnVideo={zoomed.showVideo}
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
  onZoom: (shot: Shot, showVideo: boolean) => void;
}) {
  const { screenshot, responseTimeMs, video } = result.state === 'ok' ? result : {};
  // A result with a video has tabs to swap between it and the screenshot.
  // The screenshot shows first; the video plays once its tab is picked.
  const [showVideo, setShowVideo] = useState(false);
  const playing = Boolean(video && showVideo);

  return (
    <article className="glass-card overflow-hidden rounded-2xl">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
        <span aria-hidden>{region.flag}</span>
        <h3 className="min-w-0 flex-1 basis-20 truncate text-sm font-semibold text-slate-900">{region.label}</h3>
        {video && screenshot && <ViewToggle showVideo={showVideo} onChange={setShowVideo} label={region.label} />}
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
              onClick={() => onZoom({ region, screenshot, responseTimeMs, video }, playing)}
              aria-label={playing ? `Watch the scroll video from ${region.label}` : `Enlarge screenshot from ${region.label}`}
              className="screenshot-button relative block size-full"
            >
              {/* The video plays in the card, muted and on a loop, unless the
                  visitor prefers less motion. It is only rendered once its tab
                  is picked, so nothing downloads until then. */}
              {playing && !REDUCE_MOTION ? (
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

// The Screenshot and Video tabs of a result that has a video.
function ViewToggle({
  showVideo,
  onChange,
  label,
  className = '',
}: {
  showVideo: boolean;
  onChange: (showVideo: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`view-toggle ${className}`} role="group" aria-label={`View for ${label}`}>
      <button type="button" aria-pressed={!showVideo} onClick={() => onChange(false)}>
        <ImageIcon />
        Screenshot
      </button>
      <button type="button" aria-pressed={showVideo} onClick={() => onChange(true)}>
        <PlayIcon />
        Video
      </button>
    </div>
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

function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="m2.5 11.5 3.5-3.5 2.5 2.5 2-2 3 3" />
      <circle cx="10.5" cy="6" r="1" fill="currentColor" stroke="none" />
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
function ScreenshotDialog({
  shots,
  start,
  startOnVideo,
  onClose,
}: {
  shots: Shot[];
  start: number;
  startOnVideo: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const { region, screenshot, responseTimeMs, video } = shots[index];
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The view opens on the tab its card was showing.
  const [showVideo, setShowVideo] = useState(startOnVideo);

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
        {video && <ViewToggle showVideo={showVideo} onChange={setShowVideo} label={region.label} className="mx-4 mb-3" />}
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
