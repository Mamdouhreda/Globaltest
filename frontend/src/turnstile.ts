// Cloudflare Turnstile, the bot check the backend wants with each test. With
// no site key configured (local dev) there's no check and no script to load.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let script: Promise<Turnstile> | undefined;

function loadScript(): Promise<Turnstile> {
  script ??= new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = SCRIPT_URL;
    element.async = true;
    element.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')));
    element.onerror = () => {
      // Forget the failure, so the next test can try loading it again.
      script = undefined;
      reject(new Error('Turnstile did not load'));
    };
    document.head.append(element);
  });
  return script;
}

async function issueToken(): Promise<string> {
  const turnstile = await loadScript();
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.className = 'turnstile-box';
    document.body.append(container);

    let widgetId = '';
    const finish = (settle: () => void) => {
      turnstile.remove(widgetId);
      container.remove();
      settle();
    };
    // Stays invisible unless Cloudflare needs the visitor to click something.
    widgetId = turnstile.render(container, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      callback: (token: string) => finish(() => resolve(token)),
      'error-callback': () => finish(() => reject(new Error('Turnstile failed'))),
      'timeout-callback': () => finish(() => reject(new Error('Turnstile timed out'))),
    });
  });
}

let queue: Promise<unknown> = Promise.resolve();

// A token only passes once and a test sends one request per country, so each
// request gets its own. They're issued one at a time so a visitor is never
// shown several checkboxes at once.
export function getTurnstileToken(): Promise<string | undefined> {
  if (!SITE_KEY) {
    return Promise.resolve(undefined);
  }
  const token = queue.then(issueToken);
  queue = token.catch(() => undefined);
  return token;
}
