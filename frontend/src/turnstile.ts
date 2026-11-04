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

async function issueToken(parent: HTMLElement): Promise<string> {
  const turnstile = await loadScript();
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    parent.append(container);

    let widgetId = '';
    const finish = (settle: () => void) => {
      turnstile.remove(widgetId);
      container.remove();
      settle();
    };
    // Stays invisible unless Cloudflare needs the visitor to click something.
    // The test can be started from further down the page, so bring it to them.
    widgetId = turnstile.render(container, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      'before-interactive-callback': () => parent.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      callback: (token: string) => finish(() => resolve(token)),
      'error-callback': () => finish(() => reject(new Error('Turnstile failed'))),
      'timeout-callback': () => finish(() => reject(new Error('Turnstile timed out'))),
    });
  });
}

// Shows the check inside `parent`, if Cloudflare needs one shown at all.
export async function getTurnstileToken(parent: HTMLElement): Promise<string | undefined> {
  return SITE_KEY ? issueToken(parent) : undefined;
}
