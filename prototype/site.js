const pages = ['garden', 'work', 'about', 'contact'];
const labels = { garden: '01 — LILIES', work: '02 — WORK', about: '03 — ABOUT', contact: '04 — CONTACT' };
const views = [...document.querySelectorAll('[data-page-view]')];
const links = [...document.querySelectorAll('[data-page-link]')];
const garden = document.getElementById('garden');
let currentPage;

function showPage({ focus = true } = {}) {
  const requested = window.location.hash.slice(1);
  // Leave the skip-link's target to native anchor behavior.
  if (requested === 'page-content') return;
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
  document.querySelector('.footer-index').textContent = labels[page];
  const caption = document.querySelector('.footer-caption span:last-child');
  caption.textContent = page === 'garden' ? 'BOTANICAL FORM. SYNTHETIC SOUL.' : `© ${new Date().getFullYear()} EVELYN WU`;
  document.title = page === 'garden' ? 'Unlikely Garden — Evelyn Wu' : `${page[0].toUpperCase() + page.slice(1)} — Evelyn Wu`;
  window.dispatchEvent(new CustomEvent('garden:pagechange', { detail: { page } }));
  if (focus) {
    if (page === 'garden') garden.focus({ preventScroll: true });
    else document.querySelector(`[data-page-view="${page}"] h2`).focus({ preventScroll: true });
  }
}

// Native hash links support direct URLs, reloads, browser history, and keyboard use.
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
