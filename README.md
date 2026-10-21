# Evelyn Wu · Unlikely Garden

Personal website: [e3ve35.github.io](https://e3ve35.github.io/).

A playable field of procedural chrome lilies, with synthesized bells and portfolio views for Work, About, and Contact.

## Local preview

```sh
node prototype/serve.mjs
```

Open http://127.0.0.1:4173/. The site is buildless HTML, CSS, and JavaScript. Its pinned Three.js and Tone.js libraries are included locally, with their licenses.

## Structure and deployment

- `index.html`: production homepage and portfolio content.
- `prototype/`: garden graphics, audio, navigation, styling, and browser libraries. Its `index.html` redirects earlier prototype URLs to the production homepage, preserving the selected view.
- `archive/index.html`: previous p5.js website, using the retained `js/` and font assets.
- `resume.pdf`: retained original résumé file; the portfolio uses the original Google Docs résumé link.

GitHub Pages publishes the repository root from `main` through its existing Pages deployment. `.nojekyll` keeps it a static site. There are no build dependencies, backend services, or runtime environment variables.

See [garden implementation notes](prototype/README.md) for controls and scene details.
