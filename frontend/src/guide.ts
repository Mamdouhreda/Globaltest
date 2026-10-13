import $ from 'jquery';

// Brings the written guide in index.html to life: sections slide in as they
// scroll into view and the questions fold into an accordion. The guide is
// plain HTML, so without this script everything is simply shown.

const ANSWER_MS = 220;
const STAGGER_MS = 90;

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

$(() => {
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
    { threshold: 0.15 },
  );
  $('.guide .reveal')
    .addClass('is-waiting')
    .each((_, element) => observer.observe(element));
});
