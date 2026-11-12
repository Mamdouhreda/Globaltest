import $ from 'jquery';

// Brings the written guide in index.html to life: sections slide in as they
// scroll into view and the questions fold into an accordion. The guide is
// plain HTML, so without this script everything is simply shown.

const ANSWER_MS = 220;
const STAGGER_MS = 30;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$.fx.off = reduceMotion;

function setOpen($item: JQuery<HTMLElement>, open: boolean) {
  $item.toggleClass('is-open', open);
  $item.find('h3 button').attr('aria-expanded', String(open));
  const $answer = $item.children('.faq-answer').stop(true, true);
  if (open) {
    $answer.slideDown(ANSWER_MS);
  } else {
    $answer.slideUp(ANSWER_MS);
  }
}

// Links to a part of the page glide there instead of jumping: the scroll
// starts gently, speeds up and settles, and takes a little longer the
// further it has to go. The visitor can take over at any moment.
const GLIDE_MIN_MS = 700;
const GLIDE_MAX_MS = 1600;
// Space left above the part the link goes to.
const GLIDE_GAP = 24;

let glideFrame = 0;

function stopGlide() {
  cancelAnimationFrame(glideFrame);
  window.removeEventListener('wheel', stopGlide);
  window.removeEventListener('touchstart', stopGlide);
  window.removeEventListener('keydown', stopGlide);
}

function glideTo(target: HTMLElement) {
  stopGlide();
  const from = window.scrollY;
  const limit = document.documentElement.scrollHeight - window.innerHeight;
  // The top of the page itself, for the link back to the test box.
  const top = target.id === 'root' ? 0 : target.getBoundingClientRect().top + from - GLIDE_GAP;
  const to = Math.max(0, Math.min(top, limit));
  const distance = to - from;

  function arrive() {
    stopGlide();
    // Keyboard and screen reader users continue from where the link went.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  if (reduceMotion || Math.abs(distance) < 2) {
    window.scrollTo(0, to);
    arrive();
    return;
  }

  const duration = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, Math.abs(distance) * 0.5));
  const startedAt = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - startedAt) / duration);
    // Ease in and out along a smooth curve with no sudden change of speed:
    // a soft start, a steady middle and a long, gentle stop.
    const eased = t * t * t * (t * (t * 6 - 15) + 10);
    window.scrollTo(0, from + distance * eased);
    if (t < 1) {
      glideFrame = requestAnimationFrame(step);
    } else {
      arrive();
    }
  };
  window.addEventListener('wheel', stopGlide, { passive: true });
  window.addEventListener('touchstart', stopGlide, { passive: true });
  window.addEventListener('keydown', stopGlide);
  glideFrame = requestAnimationFrame(step);
}

$(() => {
  // The header's links are drawn later by React, so the page listens for all of them.
  $(document).on('click', 'a[href^="#"]', (event) => {
    const hash = (event.currentTarget as HTMLAnchorElement).getAttribute('href') ?? '';
    const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    history.pushState(null, '', hash);
    glideTo(target);
  });

  // A round button in the corner brings the visitor back to the top. It
  // appears once the test box has scrolled away, and the ring around its
  // arrow fills as the page is read.
  const $top = $(
    '<button type="button" class="to-top" aria-label="Back to top" title="Back to top">' +
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle class="to-top-track" cx="24" cy="24" r="22" />' +
      '<circle class="to-top-ring" cx="24" cy="24" r="22" pathLength="1" />' +
      '<path d="M24 31V17M17.5 23.5 24 17l6.5 6.5" />' +
      '</svg></button>',
  ).appendTo(document.body);
  const ring = $top.find('.to-top-ring')[0];
  let topFrame = 0;
  function updateTop() {
    topFrame = 0;
    const limit = document.documentElement.scrollHeight - window.innerHeight;
    $top.toggleClass('is-shown', window.scrollY > window.innerHeight * 0.6);
    ring.style.strokeDashoffset = String(1 - (limit > 0 ? Math.min(1, window.scrollY / limit) : 0));
  }
  window.addEventListener(
    'scroll',
    () => {
      topFrame ||= requestAnimationFrame(updateTop);
    },
    { passive: true },
  );
  updateTop();
  $top.on('click', () => {
    const root = document.getElementById('root');
    if (root) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      glideTo(root);
    }
  });

  // Each question becomes a button that shows its answer; the first starts open.
  $('.faq-item').each((index, element) => {
    const $item = $(element);
    const answerId = `faq-answer-${index}`;
    $item.children('.faq-answer').attr('id', answerId).toggle(index === 0);
    $item
      .toggleClass('is-open', index === 0)
      .children('h3')
      .wrapInner(`<button type="button" aria-controls="${answerId}" aria-expanded="${index === 0}"></button>`);
  });

  $('.faq').on('click', 'h3 button', (event) => {
    const $item = $(event.currentTarget).closest<HTMLElement>('.faq-item');
    const open = !$item.hasClass('is-open');
    $item.siblings('.is-open').each((_, other) => setOpen($(other), false));
    setOpen($item, open);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    return;
  }
  // Items wait off to the side and slide in, one after another within a group.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        const $element = $(entry.target);
        window.setTimeout(() => $element.removeClass('is-waiting'), $element.index() * STAGGER_MS);
        observer.unobserve(entry.target);
      }
    },
    // Start a little before an item reaches the screen, so it is in place by
    // the time it is read, even on a fast scroll.
    { rootMargin: '0px 0px 20% 0px' },
  );
  $('.guide .reveal')
    .addClass('is-waiting')
    .each((_, element) => observer.observe(element));
});
