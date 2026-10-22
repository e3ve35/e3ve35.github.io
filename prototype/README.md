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
- Gentle pointer movements produce softer, darker bells; faster sweeps increase brightness and intensity. Each flower retains a stable pitch and a particular bell character. A gesture also sends a small, delayed ripple through nearby flowers.
- Hovering releases ASCII pollen from the stamens: an arrival burst followed by a drifting spiral while you linger. Taps and keyboard play also release bursts. The visual works with sound disabled, and lingering never repeats the audio.
- Focus the garden with Tab. Arrow keys select and play flowers; Space or Enter replays the selected flower. Sound still requires the explicit Enable sound button.
- **Distortion** adjusts chromatic separation, the response to a note, and pollen scrambling, pink echoes, and horizontal skips.
- **Replant** changes the flowers' proportions, tilt, and placement while preserving their musical identities.
- **Pause motion** disables wind, parallax, animated deformation, glitch bursts, and pollen. The operating system's reduced-motion preference is respected initially and when it changes.
- Audio is muted and active voices are released while the tab is hidden.
- The navigation links switch views without reloading the garden. Hash URLs support direct links and browser back/forward. Opening a portfolio view rests the audio and rendering until you return to the garden.

## Implementation

- `flowers.js`: three shared thick petal variants with folds and curved edges, brushed roughness, asymmetric planting, and analytically bent stems. Leaves, petals, and heads have independent movement. Batched filaments and instanced anthers reduce each lily from 43 visible draw objects to 13. Invisible head meshes follow the bloom for picking.
- `audio.js`: eight reusable FM voices, with per-note stereo panning and filtering, per-flower cooldown, D minor pentatonic notes, delay, reverb, conservative gain, and a limiter. New timbre settings apply only to free voices, preserving notes already ringing. Synthesis runs locally; there are no recorded samples or network audio requests.
- `expressions.js`: gesture normalization, stable flower characters, shared audio/visual envelope parameters, frame-rate-independent springs, and delayed neighbor ripples. Visual envelopes are aligned with the scheduled audio onset and approximate its exponential decay.
- `pollen.js`: a bounded 384-particle pool and one GPU point draw, with a single generated glyph atlas. Particles start at the moving stamens, curl upward in world space, and fade over 2.6–4.2 seconds. Depth testing lets petals occlude pollen. No per-frame canvas texture uploads or DOM particles are needed; pause, replanting, hidden tabs, and portfolio navigation clear the pool.
- `main.js`: seeded planting, synthetic environment lighting, scene setup, interactions, and one lightweight postprocessing pass. Hidden tabs and portfolio views rest the garden; pausing clears transient motion.
- `style.css`: responsive HTML overlay, independent of the WebGL canvas.
- `site.js` and `portfolio.css`: accessible portfolio navigation, a six-project accordion, an introduction, the existing résumé link, and contact details. Project content was originally migrated from `js/functions.js`; the pixel-art entry has since been updated to SharePix using its repository description and link. The résumé URL comes from `js/sketch.js`.

The scene requires WebGL 2. Initialization failure presents a readable fallback; the HTML portfolio remains usable. No tracking, microphone access, or backend is involved.

## Verification

```sh
node --test prototype/garden.test.mjs
```

Ten focused tests cover normalized gestures, stable timbres, envelope timing, frame-rate-independent spring motion, ripple propagation, finite geometry and drawing complexity, anchored stem deformation, bounded pollen lifetimes, consistent hover emission, and world-space pollen origins. Browser checks cover audio startup and its eight-voice limit, keyboard play, pointer expression, a fully static pause, replanting, navigation, and the phone layout.

The pollen release versions its entry point and new module with `ascii-pollen-1`. Existing geometry and audio imports retain `lily-expression-1` so returning visitors load the correct dependencies.

## Next design decisions

Judge the portfolio presentation alongside the flower silhouette, chrome reflections, field composition, glitch intensity, and sound character before expanding the scene. Monthly species presets can follow once those are settled.
