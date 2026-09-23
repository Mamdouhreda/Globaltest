import React, { useState } from 'react';
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

const REGIONS = [
  { value: '', label: 'Local (dev machine)' },
  { value: 'uk', label: 'UK' },
  { value: 'us', label: 'US' },
  { value: 'germany', label: 'Germany' },
];

function App() {
  const [url, setUrl] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(region ? `Starting a browser test in ${region}...` : 'Sending...');
    setScreenshot('');

    try {
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
        setStatus(`Test running in ${region}... this usually takes under a minute.`);
        const result = await pollResult(data.testId);
        if (result.status === 'ok') {
          setStatus(`Loaded from ${region} in ${result.responseTimeMs}ms`);
          setScreenshot(result.screenshot ?? '');
        } else {
          setStatus(`Test failed in ${region}: ${result.error ?? 'unknown error'}`);
        }
      } else {
        setStatus(`Chrome loaded the URL in ${data.responseTimeMs}ms`);
        setScreenshot(data.screenshot ?? '');
      }
      setUrl('');
    } catch (error) {
      console.error(error);
      setStatus('Could not load URL in backend Chrome');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label htmlFor="site-url" className="mb-2 block text-sm font-medium text-slate-700">
          Site URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="site-url"
            type="url"
            name="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
          />
          <select
            id="region"
            name="region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
          >
            {REGIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto w-full"
          >
            {isSubmitting ? 'Testing...' : 'Submit'}
          </button>
        </div>
        {status && <p className="mt-4 text-sm text-slate-600">{status}</p>}
        {screenshot && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={screenshot}
              alt="Screenshot captured by backend Chrome"
              className="block w-full"
            />
          </div>
        )}
      </form>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
