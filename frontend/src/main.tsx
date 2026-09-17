import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type UrlResponse = {
  responseTimeMs: number;
  screenshot: string;
};

function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [screenshot, setScreenshot] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Sending...');
    setScreenshot('');

    try {
      const response = await fetch('http://127.0.0.1:8080/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as UrlResponse;
      setStatus(`Chrome loaded the URL in ${data.responseTimeMs}ms`);
      setScreenshot(data.screenshot);
      setUrl('');
    } catch (error) {
      console.error(error);
      setStatus('Could not load URL in backend Chrome');
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
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-800 sm:w-auto w-full"
          >
            Submit
          </button>
        </div>
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
