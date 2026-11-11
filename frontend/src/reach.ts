import { AU, BR, DE, GB, IE, IN, US } from 'country-flag-icons/string/3x2';

// Brings the "Countries you can test from" picture in index.html to life. A
// phone running GlobalTest tests yoursite.com from each country on the map in
// turn: the address goes out along the country's line, a browser opens there,
// and a screenshot and a load time come back to the phone. Picking a country
// stops the tour and runs that country's test.

// A country's example result: its load time and what the made-up home page
// in its screenshot says. line is where the page says the visitor is, more is
// its button, and cookie is the banner's words and its button, in the
// countries that show one (the UK and the EU).
type Place = {
  flag: string;
  time: string;
  hello: string;
  line: string;
  more: string;
  cookie?: [string, string];
};

const PLACES: Record<string, Place> = {
  uk: { flag: GB, time: '1.18 s', hello: 'Welcome', line: 'You are visiting from the United Kingdom', more: 'Learn more', cookie: ['We use cookies', 'Accept'] },
  us: { flag: US, time: '1.36 s', hello: 'Welcome', line: 'You are visiting from the United States', more: 'Learn more' },
  germany: { flag: DE, time: '2.11 s', hello: 'Willkommen', line: 'Sie besuchen uns aus Deutschland', more: 'Mehr erfahren', cookie: ['Wir verwenden Cookies', 'Akzeptieren'] },
  australia: { flag: AU, time: '3.06 s', hello: 'Welcome', line: 'You are visiting from Australia', more: 'Learn more' },
  ireland: { flag: IE, time: '1.27 s', hello: 'Welcome', line: 'You are visiting from Ireland', more: 'Learn more', cookie: ['We use cookies', 'Accept'] },
  india: { flag: IN, time: '2.34 s', hello: 'स्वागत है', line: 'आप भारत से देख रहे हैं', more: 'और जानें' },
  brazil: { flag: BR, time: '4.42 s', hello: 'Bem-vindo', line: 'Você está visitando do Brasil', more: 'Saiba mais' },
};

// How long the stroke takes to run along a line, out or back.
const FLIGHT_MS = 600;
// How long the browser stays open in the country before the screenshot leaves.
const OPEN_MS = 450;
// A whole pretend test: out, open, back.
const RUN_MS = FLIGHT_MS * 2 + OPEN_MS;
// How long the tour gives each country, test included.
const TOUR_MS = 3400;

const PAUSE_ICON = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 3h2.2v10H4.5zM9.3 3h2.2v10H9.3z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z"/></svg>';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The phone stands beside the map from this width; below it, under the map.
const sideBySide = window.matchMedia('(min-width: 720px)');

type Item = {
  place: Place;
  name: string;
  city: string;
  x: number;
  button: HTMLButtonElement;
  dot: HTMLElement;
  line: SVGPathElement;
  stem: SVGLineElement;
  // Its row in the phone's list, and the load time at the end of the row.
  row: HTMLElement;
  rowTime: HTMLElement;
};

function svg<K extends keyof SVGElementTagNameMap>(tag: K, className: string): SVGElementTagNameMap[K] {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  element.setAttribute('class', className);
  return element;
}

function center(element: Element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// Starts a CSS animation again from the beginning.
function replay(element: Element, className: string) {
  element.classList.remove(className);
  element.getBoundingClientRect();
  element.classList.add(className);
}

function start(stage: HTMLElement) {
  const land = stage.querySelector<HTMLElement>('.reach-land');
  const phone = stage.querySelector<HTMLElement>('.reach-phone');
  const lines = stage.querySelector<SVGSVGElement>('.reach-lines');
  const pause = stage.querySelector<HTMLButtonElement>('.reach-pause');
  const cookie = stage.querySelector<HTMLElement>('.phone-cookie');
  const list = stage.querySelector<HTMLElement>('.phone-list');
  const steps = [...stage.querySelectorAll<HTMLElement>('.reach-steps li')];
  if (!land || !phone || !lines || !pause || !cookie || !list) {
    return;
  }
  stage.style.setProperty('--reach-flight', `${FLIGHT_MS}ms`);
  stage.style.setProperty('--reach-run', `${RUN_MS}ms`);

  const slots: Record<string, HTMLElement> = {};
  for (const element of stage.querySelectorAll<HTMLElement>('[data-slot]')) {
    slots[element.dataset.slot ?? ''] = element;
  }

  const items: Item[] = [];
  for (const li of stage.querySelectorAll<HTMLElement>('.places li')) {
    const place = PLACES[li.dataset.place ?? ''];
    const button = li.querySelector('button');
    if (!place || !button) {
      continue;
    }
    const flag = button.querySelector('.place-flag');
    if (flag) {
      flag.innerHTML = place.flag;
    }
    const name = button.querySelector('strong')?.textContent ?? '';
    const dot = document.createElement('span');
    dot.className = 'reach-dot';
    dot.style.left = li.style.getPropertyValue('--x');
    dot.style.top = li.style.getPropertyValue('--y');
    land.append(dot);

    const row = document.createElement('li');
    const rowFlag = document.createElement('span');
    rowFlag.className = 'place-flag';
    rowFlag.innerHTML = place.flag;
    const rowName = document.createElement('span');
    rowName.textContent = name;
    const rowTime = document.createElement('b');
    row.append(rowFlag, rowName, rowTime);

    items.push({
      place,
      name,
      city: button.querySelector('.place-city')?.textContent ?? '',
      x: parseFloat(dot.style.left),
      button,
      dot,
      line: lines.appendChild(svg('path', 'reach-line')),
      stem: lines.appendChild(svg('line', 'reach-stem')),
      row,
      rowTime,
    });
  }
  if (items.length === 0) {
    return;
  }
  // The tour runs west to east, and the phone lists the countries in that order.
  items.sort((a, b) => a.x - b.x);
  list.append(...items.map((item) => item.row));

  const port = lines.appendChild(svg('circle', 'reach-port'));
  port.setAttribute('r', '5');
  const comet = lines.appendChild(svg('path', 'reach-comet'));
  // Makes the comet's dashes fractions of its line, whatever its length.
  comet.setAttribute('pathLength', '1');

  let active = items[0];
  // The countries whose screenshots have come back, and whether the chosen
  // country's browser has opened yet.
  const done = new Set<Item>();
  let opened = false;
  let touring = !reduceMotion;
  let inView = false;
  let timers: number[] = [];
  let tour = 0;

  // Draws a line from each country's dot to the phone, and from the dot to
  // its label where the labels sit on the map.
  function draw() {
    const box = stage.getBoundingClientRect();
    const left = box.left + stage.clientLeft;
    const top = box.top + stage.clientTop;
    const phoneBox = phone!.getBoundingClientRect();
    const side = sideBySide.matches;
    const end = side
      ? { x: phoneBox.left - left - 10, y: phoneBox.top - top + phoneBox.height * 0.42 }
      : { x: phoneBox.left - left + phoneBox.width / 2, y: phoneBox.top - top - 10 };
    lines!.setAttribute('viewBox', `0 0 ${stage.clientWidth} ${stage.clientHeight}`);
    port.setAttribute('cx', String(end.x));
    port.setAttribute('cy', String(end.y));

    for (const item of items) {
      const dot = center(item.dot);
      const from = { x: dot.x - left, y: dot.y - top };
      const dx = end.x - from.x;
      const dy = end.y - from.y;
      // Beside the map the lines arc upwards like flight paths; under it they
      // drop from the map and curve in to the top of the phone.
      const d = side
        ? `M${from.x} ${from.y}Q${from.x + dx / 2 + dy * 0.18} ${from.y + dy / 2 - dx * 0.18} ${end.x} ${end.y}`
        : `M${from.x} ${from.y}C${from.x} ${from.y + dy * 0.6} ${end.x} ${end.y - dy * 0.6} ${end.x} ${end.y}`;
      item.line.setAttribute('d', d);

      const label = center(item.button);
      item.stem.setAttribute('x1', String(from.x));
      item.stem.setAttribute('y1', String(from.y));
      item.stem.setAttribute('x2', String(label.x - left));
      item.stem.setAttribute('y2', String(label.y - top));
    }
  }

  // Shows on the map and in the phone's list which country is chosen and
  // which have finished.
  function mark() {
    for (const item of items) {
      const on = item === active;
      const finished = done.has(item);
      item.button.setAttribute('aria-pressed', String(on));
      item.dot.classList.toggle('is-active', on);
      item.dot.classList.toggle('is-open', on && opened);
      item.dot.classList.toggle('is-done', finished);
      item.line.classList.toggle('is-active', on);
      item.row.classList.toggle('is-active', on);
      item.row.classList.toggle('is-done', finished);
      item.rowTime.textContent = finished ? item.place.time : on ? '…' : '–';
    }
  }

  // Marks the step under way in the report: 0 to 2, or 3 once all are done.
  function step(current: number) {
    steps.forEach((element, index) => {
      element.classList.toggle('is-on', index === current);
      element.classList.toggle('is-done', index < current);
    });
  }

  // The screenshot and the load time are in: shows them in the phone.
  function finish(item: Item) {
    opened = true;
    done.add(item);
    stage.classList.remove('is-running');
    slots.status.textContent = `Seen from ${item.city}, ${item.name} in ${item.place.time}`;
    slots.pill.textContent = item.place.time;
    step(3);
    mark();
  }

  // Tests from a country. With fly the test plays out along the country's
  // line; without, its result shows straight away.
  function select(item: Item, fly: boolean) {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
    comet.classList.remove('is-out', 'is-back');
    active = item;
    opened = false;
    done.delete(item);

    const { place } = item;
    slots.flag.innerHTML = place.flag;
    slots['result-flag'].innerHTML = place.flag;
    slots.country.textContent = item.name;
    slots.line.textContent = place.line;
    slots.hello.textContent = place.hello;
    slots.more.textContent = place.more;
    if (place.cookie) {
      [slots.cookie.textContent, slots.accept.textContent] = place.cookie;
    }
    cookie!.classList.toggle('is-shown', Boolean(place.cookie));

    if (!fly || reduceMotion) {
      finish(item);
      return;
    }

    // The address goes out.
    replay(stage, 'is-running');
    comet.setAttribute('d', item.line.getAttribute('d') ?? '');
    comet.classList.add('is-out');
    slots.status.textContent = `Sending yoursite.com to ${item.city}…`;
    slots.pill.textContent = 'Running';
    slots.wait.textContent = 'Starting a browser…';
    step(0);
    mark();
    timers = [
      // A browser opens it in the country.
      window.setTimeout(() => {
        opened = true;
        slots.status.textContent = `Chrome is opening it in ${item.city}…`;
        slots.wait.textContent = 'Capturing your site…';
        step(1);
        mark();
      }, FLIGHT_MS),
      // The screenshot comes back.
      window.setTimeout(() => {
        comet.classList.remove('is-out');
        comet.classList.add('is-back');
        slots.status.textContent = `Sending the screenshot back from ${item.city}…`;
        step(2);
      }, FLIGHT_MS + OPEN_MS),
      window.setTimeout(() => finish(item), RUN_MS),
    ];
  }

  // Moves the tour on after a while, unless it is paused or out of sight.
  function plan() {
    window.clearTimeout(tour);
    pause!.innerHTML = touring ? PAUSE_ICON : PLAY_ICON;
    pause!.setAttribute('aria-label', touring ? 'Pause the tour of countries' : 'Play the tour of countries');
    if (touring && inView && !document.hidden) {
      tour = window.setTimeout(() => {
        const next = items[(items.indexOf(active) + 1) % items.length];
        // Back at the first country, the test starts over.
        if (next === items[0]) {
          done.clear();
        }
        select(next, true);
        plan();
      }, TOUR_MS);
    }
  }

  for (const item of items) {
    item.button.addEventListener('click', () => {
      touring = false;
      select(item, true);
      plan();
    });
  }
  pause.addEventListener('click', () => {
    touring = !touring;
    plan();
  });
  document.addEventListener('visibilitychange', plan);

  new IntersectionObserver(
    (entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      plan();
    },
    { threshold: 0.3 },
  ).observe(stage);

  stage.classList.add('is-live');
  select(active, false);
  draw();
  new ResizeObserver(draw).observe(stage);
  // The labels change width once the web font arrives.
  document.fonts.ready.then(draw);
}

const stage = document.querySelector<HTMLElement>('.reach-stage');
if (stage) {
  start(stage);
}
