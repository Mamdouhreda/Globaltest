import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
import './reach';
import './styles.css';
import { getTurnstileToken } from './turnstile';

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
// city is where the browsers run, for the lines a running test shows.
type Region = { value: string; label: string; flag: React.ReactNode; area: string; city?: string; keywords?: string; pin?: Pin; soon?: boolean };

// Flags are SVGs because Windows has no flag emoji.
const COUNTRIES: Region[] = [
  // Pins sit on the cities the browsers run in: London, Northern Virginia,
  // Frankfurt, Sydney, Dublin, Mumbai and São Paulo.
  { value: 'uk', label: 'United Kingdom', flag: <GB className="flag" />, area: 'Europe', city: 'London', keywords: 'Britain England', pin: { x: 49.97, y: 20.96 } },
  { value: 'us', label: 'United States', flag: <US className="flag" />, area: 'Americas', city: 'Virginia', keywords: 'USA America', pin: { x: 28.47, y: 30.15 } },
  { value: 'germany', label: 'Germany', flag: <DE className="flag" />, area: 'Europe', city: 'Frankfurt', pin: { x: 52.42, y: 21.99 } },
  { value: 'australia', label: 'Australia', flag: <AU className="flag" />, area: 'Asia Pacific', city: 'Sydney', pin: { x: 92.0, y: 83.75 } },
  { value: 'ireland', label: 'Ireland', flag: <IE className="flag" />, area: 'Europe', city: 'Dublin', pin: { x: 48.25, y: 19.63 } },
  { value: 'india', label: 'India', flag: <IN className="flag" />, area: 'Asia Pacific', city: 'Mumbai', pin: { x: 70.25, y: 44.78 } },
  { value: 'brazil', label: 'Brazil', flag: <BR className="flag" />, area: 'Americas', city: 'São Paulo', pin: { x: 37.06, y: 76.18 } },
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
  ...(import.meta.env.DEV ? [{ value: '', label: 'Local', flag: '💻', area: 'This computer', city: 'your computer' }] : []),
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
// result has a scroll video; Facebook fits on one screen. MSN comes first
// because its page is full from the top; Yahoo's opens on empty ad space.
const EXAMPLES: Example[] = [
  example('MSN', 'msn.com', '4 November 2026', [msnUs, msnBrazil, msnGermany, msnIndia], [6903, 1527, 1233, 1241], [msnUsVideo, msnBrazilVideo, msnGermanyVideo, msnIndiaVideo]),
  example('Facebook', 'facebook.com', '4 November 2026', [facebookUs, facebookBrazil, facebookGermany, facebookIndia], [1364, 1687, 1035, 2730]),
  example('Yahoo', 'yahoo.com', '4 November 2026', [yahooUs, yahooBrazil, yahooGermany, yahooIndia], [1361, 4418, 2113, 2343], [yahooUsVideo, yahooBrazilVideo, yahooGermanyVideo, yahooIndiaVideo]),
];

// A copied test link carries the address and the countries, so opening it
// fills in the same test, ready to run.
function readLinkedTest(): { url: string; countries: string[] } {
  const params = new URLSearchParams(window.location.search);
  const countries = (params.get('countries') ?? '')
    .split(',')
    .filter((value) => COUNTRIES.some((region) => region.value === value && !region.soon));
  return { url: params.get('url') ?? '', countries: countries.length > 0 ? countries : STARTING_COUNTRIES };
}
const LINKED_TEST = readLinkedTest();

function testLink(url: string, countries: string[]): string {
  const params = new URLSearchParams({ url, countries: countries.filter(Boolean).join(',') });
  return `${window.location.origin}${window.location.pathname}?${params}`;
}

// The site's name without the rest of its address, for file names.
function hostName(site: string): string {
  try {
    return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname;
  } catch {
    return 'screenshot';
  }
}

// Saves a screenshot as a file. A result's screenshot is a link to another
// server, which the browser only saves if it is fetched first; if that isn't
// allowed, the image opens in a new tab to save from there.
async function downloadScreenshot(shot: Shot, site: string) {
  let href = shot.screenshot;
  if (!href.startsWith('data:')) {
    try {
      const response = await fetch(href);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      href = URL.createObjectURL(await response.blob());
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      window.open(shot.screenshot, '_blank', 'noopener');
      return;
    }
  }
  const link = document.createElement('a');
  link.href = href;
  link.download = `${hostName(site)}-${shot.region.value || 'local'}.png`;
  link.click();
}

// The title in index.html, which a running test swaps for its progress.
const PAGE_TITLE = document.title;

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
  // The backend writes these two for the user: a daily limit or the bot check.
  if (response.status === 403 || response.status === 429) {
    throw new TestError((await response.text()).trim());
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

// The backend's pass lasts 10 minutes; stop using it a little before that.
const BOT_PASS_LIFETIME_MS = 9 * 60_000;

async function fetchBotPass(checkArea: HTMLElement): Promise<string | undefined> {
  let token: string | undefined;
  try {
    token = await getTurnstileToken(checkArea);
  } catch {
    throw new TestError("The bot check couldn't run. Refresh the page and try again.");
  }
  if (token === undefined) {
    return undefined;
  }
  const response = await request(`${API_URL}/verify`, "The bot check couldn't run. Try again in a moment.", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  return ((await response.json()) as { pass: string }).pass;
}

let botPass: { value: Promise<string | undefined>; expiresAt: number } | undefined;

// A visitor does the bot check once, and every country in the run and any run
// soon after uses the same pass. A failed check isn't kept, so the next run can
// try again.
function getBotPass(checkArea: HTMLElement): Promise<string | undefined> {
  if (!botPass || Date.now() >= botPass.expiresAt) {
    const value = fetchBotPass(checkArea);
    const current = { value, expiresAt: Date.now() + BOT_PASS_LIFETIME_MS };
    botPass = current;
    value.catch(() => {
      if (botPass === current) {
        botPass = undefined;
      }
    });
  }
  return botPass.value;
}

// Runs one test in one region, with a screenshot and, if asked for, a scroll
// video. Regional
// tests start a Fargate task and are polled; the local test returns its
// results directly.
async function runTest(url: string, region: string, video: boolean, turnstile: string | undefined): Promise<RegionResult> {
  const response = await request(`${API_URL}/url`, "Couldn't start a browser here. Try again in a moment.", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, region, video, turnstile }),
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

// The closed picker's short form, beside the chosen flags.
function countCountries(chosen: Region[], total: number): string {
  if (chosen.length === 0) {
    return 'Choose countries';
  }
  if (chosen.length === 1) {
    return chosen[0].label;
  }
  return chosen.length === total ? `All ${total} countries` : `${chosen.length} countries`;
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
    <>
      <p id={labelId} className="sr-only">
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
          data-tour="countries"
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
          {/* The pill is short, so it shows a count beside the flags; screen
              readers get the names. */}
          <span id={`${panelId}-summary`} className="sr-only">
            {describeCountries(chosen, available.length)}
          </span>
          <span aria-hidden className="min-w-0 flex-1 truncate text-left">
            {countCountries(chosen, available.length)}
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
    </>
  );
}

// Every test takes a screenshot; this pill adds a video of the page
// scrolling, which takes a little longer.
function VideoToggle({ recordVideo, onChange }: { recordVideo: boolean; onChange: (recordVideo: boolean) => void }) {
  return (
    <label
      data-tour="video"
      title="Also record a video of the whole page scrolling. About 10 s longer."
      className={`country-chip box-chip cursor-pointer ${recordVideo ? 'is-checked' : ''}`}
    >
      <input
        type="checkbox"
        checked={recordVideo}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <PlayIcon />
      Video
      <span className="hidden text-xs font-normal text-slate-600 sm:inline">+10 s</span>
    </label>
  );
}

// A short tour of the test box. Each step lights up one part of the real
// page, found by its data-tour name, and says what it does.
const TOUR_STEPS = [
  {
    target: 'address',
    title: 'Type a website',
    text: "Any public address works, like example.com. You don't need an account.",
  },
  {
    target: 'countries',
    title: 'Choose the countries',
    text: 'Open this to pick where to test from. A real Chrome browser opens your site in each one.',
  },
  {
    target: 'video',
    title: 'Add a video, if you like',
    text: 'Every test takes a screenshot. Turn on Video to also record the whole page scrolling. It takes about 10 s longer.',
  },
  {
    target: 'start',
    title: 'Start the test',
    text: 'Press Test or Enter. Each country gets a card below with its screenshot and load time, usually in under a minute.',
  },
];

// Room the card needs under a part before it goes above it instead.
const TOUR_CARD_ROOM = 230;

function Tour({ onClose, onTry }: { onClose: () => void; onTry: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect>();
  const [radius, setRadius] = useState('16px');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const textId = useId();
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  // Bring the step's part into view, and keep the light on it as the page
  // scrolls or resizes.
  useLayoutEffect(() => {
    const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!element) {
      return;
    }
    element.scrollIntoView({ block: 'center', behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
    const own = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 8;
    setRadius(`${Math.min(own, 28) + 6}px`);
    const update = () => setRect(element.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [step.target]);

  // The card can only take focus once it's placed and showing.
  const placed = rect !== undefined;
  useEffect(() => {
    if (placed) {
      cardRef.current?.focus();
    }
  }, [index, placed]);

  // Esc and the arrow keys work wherever focus is while the tour is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight' && !last) {
        setIndex(index + 1);
      } else if (event.key === 'ArrowLeft' && index > 0) {
        setIndex(index - 1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, last, onClose]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Tab') {
      // Keep the keyboard inside the card while the tour is open.
      const buttons = [...(cardRef.current?.querySelectorAll('button') ?? [])];
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }
  }

  // The card sits under the lit part, or above it when there's no room,
  // and stays inside the screen.
  let cardStyle: React.CSSProperties = { visibility: 'hidden' };
  if (rect) {
    const width = Math.min(340, window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), window.innerWidth - 16 - width);
    cardStyle =
      window.innerHeight - rect.bottom >= TOUR_CARD_ROOM
        ? { left, width, top: rect.bottom + 16 }
        : { left, width, bottom: window.innerHeight - rect.top + 16 };
  }

  return (
    <div className="tour" onKeyDown={onKeyDown}>
      {rect && (
        <div
          className="tour-spot"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: radius }}
          aria-hidden
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
        className="tour-card"
        style={cardStyle}
      >
        <p className="tour-count">
          Step {index + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id={titleId} className="mt-1 text-[17px] font-bold text-slate-900">
          {step.title}
        </h2>
        <p id={textId} className="mt-1.5 text-sm leading-relaxed text-slate-700">
          {step.text}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="tour-dots" aria-hidden>
            {TOUR_STEPS.map((item, itemIndex) => (
              <i key={item.target} className={itemIndex === index ? 'is-active' : ''} />
            ))}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {last ? (
              <>
                <button type="button" onClick={onClose} className="retry-button">
                  Done
                </button>
                <button type="button" onClick={onTry} className="picker-done">
                  Try example.com
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="text-button rounded-full px-2.5 py-1 text-sm font-semibold">
                  Skip
                </button>
                {index > 0 && (
                  <button type="button" onClick={() => setIndex(index - 1)} className="retry-button">
                    Back
                  </button>
                )}
                <button type="button" onClick={() => setIndex(index + 1)} className="picker-done">
                  Next
                </button>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function TourIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4.5M12 8h.01" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
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
  const [url, setUrl] = useState(LINKED_TEST.url);
  const [urlError, setUrlError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const checkAreaRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>(LINKED_TEST.countries);
  const [testedUrl, setTestedUrl] = useState('');
  // A scroll video adds time and cost, so tests take a screenshot only unless
  // the visitor asks for one.
  const [recordVideo, setRecordVideo] = useState(false);
  const [testedVideo, setTestedVideo] = useState(false);
  const [results, setResults] = useState<Record<string, RegionResult>>({});
  // The enlarged view holds every shot of the test, so it can flip between
  // countries in place.
  const [zoomed, setZoomed] = useState<{ shots: Shot[]; index: number; showVideo: boolean; site: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const tourButtonRef = useRef<HTMLButtonElement>(null);
  const [touring, setTouring] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const urlErrorId = useId();
  const countryErrorId = useId();

  const isSubmitting = checking || Object.values(results).some((result) => result.state === 'running');

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

  // Returns the bot pass, or null if the check failed and said why on the form.
  async function passBotCheck(): Promise<string | undefined | null> {
    setCheckError('');
    setChecking(true);
    try {
      return await getBotPass(checkAreaRef.current!);
    } catch (error) {
      if (!(error instanceof TestError)) {
        console.error(error);
      }
      setCheckError(error instanceof TestError ? error.message : 'Something went wrong. Try again.');
      return null;
    } finally {
      setChecking(false);
    }
  }

  async function runRegion(region: string, target: string, video: boolean, pass: string | undefined) {
    setResult(region, { state: 'running', startedAt: Date.now() });
    try {
      setResult(region, await runTest(target, region, video, pass));
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

  async function retryRegion(region: string) {
    const pass = await passBotCheck();
    if (pass !== null) {
      await runRegion(region, testedUrl, testedVideo, pass);
    }
  }

  async function startTest(target: string, regions: string[], video: boolean) {
    setResults({});

    // Nothing is sent, and no card or timer shows, until the check has passed.
    const pass = await passBotCheck();
    if (pass === null) {
      return;
    }

    setTestedUrl(target);
    setTestedVideo(video);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

    await Promise.all(regions.map((region) => runRegion(region, target, video, pass)));
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
  const loaded = resultRegions.filter((region) => results[region.value].state === 'ok').length;

  // A test takes up to a minute, so visitors often switch tabs while it runs.
  // The tab title counts the countries as they finish, and once all have,
  // says so until the visitor comes back.
  useEffect(() => {
    const total = resultRegions.length;
    if (total === 0) {
      document.title = PAGE_TITLE;
      return;
    }
    if (finished < total) {
      document.title = `(${finished}/${total}) Testing… · GlobalTest`;
      return;
    }
    const watching = () => document.visibilityState === 'visible' && document.hasFocus();
    if (watching()) {
      document.title = PAGE_TITLE;
      return;
    }
    document.title = loaded > 0 ? '✓ Results ready · GlobalTest' : "✕ Didn't load · GlobalTest";
    function onReturn() {
      if (watching()) {
        document.title = PAGE_TITLE;
        stopListening();
      }
    }
    function stopListening() {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    }
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return stopListening;
  }, [resultRegions.length, finished, loaded]);

  let fastest: { region: Region; ms: number } | undefined;
  let slowest: { region: Region; ms: number } | undefined;
  for (const region of resultRegions) {
    const result = results[region.value];
    if (result.state === 'ok' && result.responseTimeMs !== undefined) {
      if (!fastest || result.responseTimeMs < fastest.ms) {
        fastest = { region, ms: result.responseTimeMs };
      }
      if (!slowest || result.responseTimeMs > slowest.ms) {
        slowest = { region, ms: result.responseTimeMs };
      }
    }
  }

  // Once every country has finished, the line says how the test went: how
  // many countries the site loaded in, and the fastest and slowest of them.
  const allFinished = resultRegions.length > 0 && finished === resultRegions.length;
  let summary = `${finished} of ${resultRegions.length} countries finished`;
  if (allFinished) {
    if (loaded === 0) {
      summary = "The site didn't load from any country";
    } else if (resultRegions.length === 1) {
      summary = fastest ? `Loaded from ${fastest.region.label} in ${formatTime(fastest.ms)}` : 'Loaded';
    } else {
      summary = `Loaded in ${loaded} of ${resultRegions.length} countries`;
      if (fastest && slowest && fastest.region !== slowest.region) {
        summary += ` · fastest ${fastest.region.label} ${formatTime(fastest.ms)} · slowest ${slowest.region.label} ${formatTime(slowest.ms)}`;
      }
    }
  }

  const resultShots: Shot[] = [];
  for (const region of resultRegions) {
    const result = results[region.value];
    if (result.state === 'ok' && result.screenshot) {
      resultShots.push({ region, screenshot: result.screenshot, responseTimeMs: result.responseTimeMs, video: result.video });
    }
  }

  function zoom(shots: Shot[], shot: Shot, showVideo: boolean, site: string) {
    setZoomed({ shots, index: Math.max(0, shots.findIndex((item) => item.region.value === shot.region.value)), showVideo, site });
  }

  async function copyTestLink() {
    try {
      await navigator.clipboard.writeText(testLink(testedUrl, resultRegions.map((region) => region.value)));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  const startLabel = isSubmitting
    ? checking
      ? 'Checking…'
      : 'Testing…'
    : selected.length === 0
      ? 'Test'
      : `Test ${selected.length} ${selected.length === 1 ? 'country' : 'countries'}`;

  const shown = EXAMPLES[exampleIndex];

  return (
    <main className="relative px-4 pb-12 pt-4 text-slate-800">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="hero-glow">
          <div className="hero-glow-orb" />
        </div>
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center gap-2.5">
        <Logo flags={LOGO_REGIONS.flatMap((value) => REGIONS.filter((region) => region.value === value).map((region) => region.flag))} />
        <p className="text-lg font-bold tracking-tight text-[#3a1408]">GlobalTest</p>
        <nav aria-label="On this page" className="ml-auto flex items-center gap-1 text-sm font-semibold">
          <a href="#how-it-works" className="text-button rounded-full px-3 py-1.5">
            How it works
          </a>
          <a href="#faq" className="text-button rounded-full px-3 py-1.5">
            FAQ
          </a>
        </nav>
      </div>

      <div className="relative mx-auto mt-6 flex max-w-4xl flex-col items-center text-center sm:mt-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[#3a1408] sm:text-[36px] lg:whitespace-nowrap lg:text-[40px]">
          See your website from any location
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700 sm:text-lg">
          Real Chrome browsers open your site in the countries you pick. You get a screenshot and the load time
          from each one, and a video of the whole page if you want it.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full max-w-3xl flex-col items-center gap-3">
          {/* One box holds the whole test: the address on top, and under it
              the countries, the video choice and the button to start. */}
          <div
            className={`prompt-box w-full ${urlError ? 'is-invalid' : ''}`}
            // The box reads as one field, so a press on its empty space goes to the address.
            onMouseDown={(event) => {
              if (!(event.target as Element).closest('button, label, input, .picker')) {
                event.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            <label className="block pb-5 sm:pb-8">
              <span className="sr-only">Website address</span>
              <input
                ref={inputRef}
                data-tour="address"
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
                placeholder="Enter a website, like example.com"
                aria-invalid={urlError ? true : undefined}
                aria-describedby={urlError ? urlErrorId : undefined}
                className="block h-8 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500 sm:text-lg"
              />
            </label>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <CountryPicker
                  selected={selected}
                  onToggle={toggleRegion}
                  onSetAll={setSelected}
                  errorId={selected.length === 0 ? countryErrorId : undefined}
                />
                <VideoToggle recordVideo={recordVideo} onChange={setRecordVideo} />
              </div>
              <button
                ref={sendRef}
                data-tour="start"
                type="submit"
                disabled={isSubmitting}
                aria-label={startLabel}
                className="send-button"
              >
                {/* Phones have room for the arrow only */}
                <span className="hidden sm:inline">{startLabel}</span>
                {isSubmitting ? <span className="spinner" aria-hidden /> : <ArrowUpIcon />}
              </button>
            </div>
          </div>
          {urlError && (
            <p id={urlErrorId} role="alert" className="self-start text-left text-sm font-medium text-rose-700">
              {urlError}
            </p>
          )}
          {selected.length === 0 && (
            <p id={countryErrorId} role="alert" className="self-start text-left text-sm font-medium text-rose-700">
              Pick at least one country.
            </p>
          )}

          {checking && (
            <p role="status" className="text-sm font-medium text-slate-700">
              Checking you're human before starting the test…
            </p>
          )}
          <div ref={checkAreaRef} className="flex justify-center empty:hidden" />
          {checkError && (
            <p role="alert" className="text-sm font-medium text-rose-700">
              {checkError}
            </p>
          )}

          <button ref={tourButtonRef} type="button" onClick={() => setTouring(true)} className="tour-link">
            <TourIcon />
            New here? Take a quick tour
          </button>
        </form>
      </div>

      {touring && (
        <Tour
          onClose={() => {
            setTouring(false);
            requestAnimationFrame(() => tourButtonRef.current?.focus());
          }}
          onTry={() => {
            setUrl('example.com');
            setUrlError('');
            setTouring(false);
            requestAnimationFrame(() => sendRef.current?.focus());
          }}
        />
      )}

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
            start there first. Select a screenshot to enlarge it.
          </p>
          {allFinished && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startTest(testedUrl, resultRegions.map((region) => region.value), testedVideo)}
                className="retry-button"
              >
                Run again
              </button>
              <button type="button" onClick={copyTestLink} className="retry-button">
                {copied ? 'Link copied' : 'Copy test link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setUrlError('');
                  inputRef.current?.focus();
                }}
                className="retry-button"
              >
                Test another site
              </button>
            </div>
          )}
          <div className="results-grid">
            {resultRegions.map((region) => (
              <ResultCard
                key={region.value}
                region={region}
                result={results[region.value]}
                site={testedUrl}
                onRetry={() => retryRegion(region.value)}
                onZoom={(shot, showVideo) => zoom(resultShots, shot, showVideo, testedUrl)}
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
          <ExampleShowcase key={shown.url} example={shown} hold={zoomed !== null} onZoom={(shot, showVideo) => zoom(shown.shots, shot, showVideo, shown.url)} />
        </section>
      )}

      {zoomed && (
        <ScreenshotDialog
          shots={zoomed.shots}
          start={zoomed.index}
          startOnVideo={zoomed.showVideo}
          site={zoomed.site}
          onClose={() => setZoomed(null)}
        />
      )}
    </main>
  );
}

// A test reports nothing until it's done, so a running card only says what
// is known to be true: a browser is starting in the country, which is most of
// the wait, and then the result is on its way.
const STARTING_MS = 20_000;
const SLOW_MS = 60_000;

function RunningMeter({ region, startedAt }: { region: Region; startedAt: number }) {
  const elapsed = useElapsed(startedAt);
  const percent = Math.round(estimateProgress(elapsed) * 100);

  const where = region.value === '' ? 'on your computer' : `in ${region.city ?? region.label}`;
  let line = `Starting a Chrome browser ${where}…`;
  if (elapsed > SLOW_MS) {
    line = 'Still going. Some pages are slow from far away…';
  } else if (elapsed > STARTING_MS) {
    line = `Waiting for the screenshot from ${region.city ?? region.label}…`;
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-2.5 px-4 py-3 text-center">
      <Twinkle />
      <p key={line} className="waiting-line text-sm font-semibold text-slate-800">
        {line}
      </p>
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

// A few sparkles twinkling out of step, to show a running test is alive.
function Twinkle() {
  return (
    <span className="twinkle" aria-hidden>
      <Sparkle className="twinkle-star twinkle-main" />
      <Sparkle className="twinkle-star twinkle-small" />
      <Sparkle className="twinkle-star twinkle-tiny" />
    </span>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0Q13 11 24 12Q13 13 12 24Q11 13 0 12Q11 11 12 0Z" />
    </svg>
  );
}

function ResultCard({
  region,
  result,
  site,
  onRetry,
  onZoom,
}: {
  region: Region;
  result: RegionResult;
  // The address tested, for the name of a saved screenshot.
  site: string;
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
        {screenshot && (
          <button
            type="button"
            onClick={() => downloadScreenshot({ region, screenshot, responseTimeMs, video }, site)}
            aria-label={`Download screenshot from ${region.label}`}
            title="Download screenshot"
            className="icon-button"
          >
            <DownloadIcon />
          </button>
        )}
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

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 13h10" />
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
  site,
  onClose,
}: {
  shots: Shot[];
  start: number;
  startOnVideo: boolean;
  site: string;
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
          <button type="button" onClick={() => downloadScreenshot(shots[index], site)} className="retry-button">
            Download
          </button>
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
