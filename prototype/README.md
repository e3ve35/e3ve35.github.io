# Unlikely Garden · study 001

A garden and portfolio for Evelyn Wu: 18 procedural chrome lilies, colored studio reflections, FM bells, and localized visual glitches. Garden, Work, About, and Contact views share the same scene. The production homepage is the root `index.html`; this folder holds its assets. The previous portfolio is preserved at `/archive/`, and old `/prototype/` links redirect to the homepage with their fragment intact.

## Preview

From the repository root, run:

```sh
node prototype/serve.mjs
```

Open http://127.0.0.1:4173/. No package installation or build is needed. Pinned browser libraries are vendored locally: Three.js 0.180.0 and Tone.js 15.1.22. The font is reused from the existing portfolio.

## Interact

- Click **Enable sound**, then hover over flower heads. On a phone, tap them.
- Focus the garden with Tab. Arrow keys select and play flowers; Space or Enter replays the selected flower. Sound still requires the explicit Enable sound button.
- **Distortion** adjusts chromatic separation and the response to a note.
- **Replant** changes the flowers' proportions, tilt, and placement while preserving their musical identities.
- **Pause motion** disables wind, parallax, animated deformation, and glitch bursts. The operating system's reduced-motion preference is respected initially and when it changes.
- Audio is muted and active voices are released while the tab is hidden.
- The navigation links switch views without reloading the garden. Hash URLs support direct links and browser back/forward. Opening a portfolio view rests the audio and rendering until you return to the garden.

## Implementation

- `flowers.js`: shared petal/leaf geometry and materials; six petals, curved stems, and six stamens per lily. Invisible flower-head meshes handle picking independently of the detailed surfaces.
- `audio.js`: four shared stereo voice pools, eight simultaneous voices maximum, per-flower cooldown, D minor pentatonic notes, delay, reverb, conservative gain, and a limiter. Synthesis runs locally; there are no recorded samples or network audio requests.
- `main.js`: seeded planting, synthetic environment lighting, scene setup, interactions, and one lightweight postprocessing pass. This is an aesthetic study, not a complete portfolio migration.
- `style.css`: responsive HTML overlay, independent of the WebGL canvas.
- `site.js` and `portfolio.css`: accessible portfolio navigation, a six-project accordion, an introduction, the existing résumé link, and contact details. Project content was originally migrated from `js/functions.js`; the pixel-art entry has since been updated to SharePix using its repository description and link. The résumé URL comes from `js/sketch.js`.

The scene requires WebGL 2. Initialization failure presents a readable fallback; the HTML portfolio remains usable. No tracking, microphone access, or backend is involved.

## Next design decisions

Judge the portfolio presentation alongside the flower silhouette, chrome reflections, field composition, glitch intensity, and sound character before expanding the scene. Monthly species presets can follow once those are settled.
