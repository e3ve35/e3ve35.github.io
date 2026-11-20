import { translations } from './translations.js?v=about-zh-1';

const languages = ['en', 'zh-Hans', 'ja'];
const preferenceKey = 'evelyn-site-language';
const localizedAttributes = [
  ['data-i18n', 'textContent'],
  ['data-i18n-aria', 'aria-label'],
  ['data-i18n-alt', 'alt'],
  ['data-i18n-content', 'content'],
];
let language = 'en';

export function currentLanguage() { return language; }

export function text(key, values = {}, fallback = '') {
  const template = translations[language][key] ?? translations.en[key] ?? fallback;
  return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}

function urlLanguage() {
  const requested = new URLSearchParams(location.search).get('lang');
  return requested === null ? null : languages.find((item) => item.toLowerCase() === requested.toLowerCase()) ?? 'en';
}

function localizedUrl(nextLanguage, hash = location.hash) {
  const url = new URL(location.href);
  url.searchParams.set('lang', nextLanguage);
  url.hash = hash;
  return url;
}

export function initializeLocale() {
  const fields = localizedAttributes.flatMap(([marker, attribute]) => {
    const content = attribute === 'textContent';
    return [...document.querySelectorAll(`[${marker}]`)].map((node) => {
      const key = node.getAttribute(marker);
      const fallback = content ? node.textContent : node.getAttribute(attribute);
      return (values) => {
        const value = text(key, values, fallback);
        if (content) node.textContent = value;
        else node.setAttribute(attribute, value);
      };
    });
  });
  const switcher = document.querySelector('.language-switch');
  const links = [...switcher.querySelectorAll('[data-language]')];
  const canonical = document.querySelector('link[rel="canonical"]');

  function syncLinks() {
    const hash = location.hash === '#page-content' ? `#${document.body.dataset.page}` : location.hash;
    for (const link of links) {
      link.href = localizedUrl(link.dataset.language, hash);
      if (link.dataset.language === language) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  function apply(nextLanguage, notify = true) {
    if (notify && language === nextLanguage) { syncLinks(); return; }
    language = nextLanguage;
    document.documentElement.lang = language;
    const canonicalUrl = new URL(canonical.getAttribute('href'));
    if (language === 'en') canonicalUrl.searchParams.delete('lang');
    else canonicalUrl.searchParams.set('lang', language);
    canonical.href = canonicalUrl;
    const values = { name: text('site.name') };
    for (const update of fields) update(values);
    syncLinks();
    if (notify) window.dispatchEvent(new Event('site:localechange'));
  }

  let preference;
  try { preference = localStorage.getItem(preferenceKey); } catch { /* Storage can be disabled. */ }
  const requested = urlLanguage();
  const initial = requested ?? (languages.includes(preference) ? preference : 'en');
  if (requested === null && initial !== 'en') history.replaceState(history.state, '', localizedUrl(initial));
  apply(initial, false);
  switcher.hidden = false;

  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const next = link.dataset.language;
      try { localStorage.setItem(preferenceKey, next); } catch { /* Storage can be disabled. */ }
      if (next === language) return;
      history.pushState(null, '', link.href);
      apply(next);
    });
  }
  window.addEventListener('hashchange', syncLinks);
  window.addEventListener('popstate', () => apply(urlLanguage() ?? 'en'));
}
