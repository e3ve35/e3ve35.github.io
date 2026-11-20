import { setupProjectPreviews } from './project-previews.js?v=project-previews-1';
import { currentLanguage, initializeLocale, languages, siteName, text } from './i18n.js?v=wordmark-1';

const pages = ['garden', 'work', 'about', 'contact'];
const views = [...document.querySelectorAll('[data-page-view]')];
const links = [...document.querySelectorAll('[data-page-link]')];
const garden = document.getElementById('garden');
let currentPage;

function syncPageLabels() {
  const page = currentPage ?? 'garden';
  const title = page === 'garden' ? text('site.title') : text(`page.${page}`);
  const name = siteName();
  const index = String(pages.indexOf(page) + 1).padStart(2, '0');
  document.querySelector('.footer-index').textContent = page === 'garden'
    ? document.body.dataset.studyLabel || `01 — ${text('species.lily', {}, 'Lilies').toUpperCase()}`
    : `${index} — ${title.toUpperCase()}`;
  document.querySelector('.footer-caption span:last-child').textContent = page === 'garden'
    ? text('footer.garden')
    : text('site.copyright', { year: new Date().getFullYear(), name });
  document.title = `${title} — ${name}`;
}

function showPage({ focus = true } = {}) {
  const requested = window.location.hash.slice(1);
  // Leave the skip-link's target to native anchor behavior.
  if (requested === 'page-content' && currentPage) return;
  const page = pages.includes(requested) ? requested : 'garden';
  if (page === currentPage) return;
  currentPage = page;
  document.body.dataset.page = page;
  for (const view of views) {
    view.hidden = view.dataset.pageView !== page;
    if (!view.hidden) view.scrollTop = 0;
  }
  for (const link of links) {
    if (link.dataset.pageLink === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  garden.inert = page !== 'garden';
  garden.setAttribute('aria-hidden', String(page !== 'garden'));
  document.querySelector('.specimen-card').hidden = page !== 'garden';
  document.querySelector('.controls').hidden = page !== 'garden';
  syncPageLabels();
  window.dispatchEvent(new CustomEvent('garden:pagechange', { detail: { page } }));
  if (focus) {
    if (page === 'garden') garden.focus({ preventScroll: true });
    else document.querySelector(`[data-page-view="${page}"] h2`).focus({ preventScroll: true });
  }
}

function setupWordmark() {
  const label = document.querySelector('.name-label');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index;
  let timer;

  function showName() {
    const language = languages[index];
    label.lang = language;
    label.textContent = siteName(language);
  }

  function reset() {
    clearInterval(timer);
    label.classList.remove('name-glitch');
    index = languages.indexOf(currentLanguage());
    showName();
    if (document.hidden || reducedMotion.matches || document.body.dataset.motion === 'paused') return;
    timer = setInterval(() => {
      index = (index + 1) % languages.length;
      showName();
      label.classList.add('name-glitch');
    }, 3400);
  }

  label.addEventListener('animationend', () => label.classList.remove('name-glitch'));
  window.addEventListener('site:localechange', reset);
  window.addEventListener('garden:motionchange', reset);
  document.addEventListener('visibilitychange', reset);
  reducedMotion.addEventListener('change', reset);
  reset();
}

// Native hash links support direct URLs, reloads, browser history, and keyboard use.
initializeLocale();
setupWordmark();
window.addEventListener('site:localechange', syncPageLabels);
window.addEventListener('hashchange', () => showPage());
showPage({ focus: false });

// Keep the index compact, with a single project expanded at a time.
const projects = [...document.querySelectorAll('.project')];
for (const project of projects) {
  project.addEventListener('toggle', () => {
    if (!project.open) return;
    for (const other of projects) if (other !== project) other.open = false;
  });
}

setupProjectPreviews(document.getElementById('work'));
