# Unlikely Garden · studies 001–002

A garden and portfolio for Evelyn Wu: two studies of 18 procedural chrome flowers, colored studio reflections, synthesized tones, and localized visual glitches. Garden, Work, About, and Contact views share the same scene. The production homepage is the root `index.html`; this folder holds its assets. The previous portfolio is preserved at `/archive/`, and old `/prototype/` links redirect to the homepage with their fragment intact.

## Preview

From the repository root, run:

```sh
node prototype/serve.mjs
```

Open http://127.0.0.1:4173/. No package installation or build is needed. Pinned browser libraries are vendored locally: Three.js 0.180.0 and Tone.js 15.1.22. The font is reused from the existing portfolio.

## Interact

- Click **Enable sound**, then hover over flower heads. On a phone, tap them.
- **Seasonal garden** follows the visitor's local month by default. **Now** selects a curated Northern Hemisphere art calendar: winter lilies in cool light (December–February), spring poppies (March–May), summer lilies (June–August), and autumn poppies in warmer light (September–November). These are creative presets rather than botanical bloom predictions. The current month appears above the selector. **Lilies** and **Poppies** override the calendar; the choice survives reloads in the same tab through session storage, and Now restores the calendar. Disabled storage gracefully falls back to the seasonal default on reload.
- Poppies have four broad, crumpled petals, a dark seed pod, a ring of copper stamens, softer A pentatonic tones, and sunset-colored ASCII seeds drifting outward. Changing species releases active voices, clears pollen, and replants the same field seed; switching modes within the same species keeps the scene intact. Sound stays opt-in and the motion preference is preserved.
- Gentle pointer movements produce softer, darker bells; faster sweeps increase brightness and intensity. Each flower retains a stable pitch and a particular bell character. A gesture also sends a small, delayed ripple through nearby flowers.
- Hovering releases mainly bright yellow ASCII pollen, with occasional sunset-orange characters and orange glitch echoes, from the stamens: an arrival burst followed by a drifting spiral while you linger. Taps and keyboard play also release bursts. The visual works with sound disabled, and lingering never repeats the audio.
- Focus the garden with Tab. Arrow keys select and play flowers; Space or Enter replays the selected flower. Sound still requires the explicit Enable sound button.
- **Distortion** adjusts chromatic separation, the response to a note, and pollen scrambling, pink echoes, and horizontal skips.
- **Replant** changes the flowers' proportions, tilt, and placement while preserving their musical identities.
- **Pause motion** disables wind, parallax, animated deformation, glitch bursts, and pollen. The operating system's reduced-motion preference is respected initially and when it changes.
- Audio is muted and active voices are released while the tab is hidden.
- The navigation links switch views without reloading the garden. Hash URLs support direct links and browser back/forward. Opening a portfolio view rests the audio and rendering until you return to the garden.

## Implementation

- `flowers.js`: shared thick petal variants for six-petal lilies and four-petal poppies, brushed roughness, asymmetric planting, and analytically bent stems. Leaves, petals, and heads have independent movement; poppies flutter more loosely. Batched filaments and instanced anthers keep both species at no more than 13 visible draw objects per flower. Shared assets survive study changes; each replaced flower's private geometry and instance buffers are disposed. Invisible head meshes follow the bloom for picking.
- `audio.js`: eight reusable FM voices, with per-note stereo panning and filtering, per-flower cooldown, D minor pentatonic notes for lilies and a lower A minor pentatonic palette for poppies, delay, reverb, conservative gain, and a limiter. New timbre settings apply only to free voices, preserving notes already ringing. Synthesis runs locally; there are no recorded samples or network audio requests.
- `expressions.js`: gesture normalization, stable flower characters, shared audio/visual envelope parameters, frame-rate-independent springs, and delayed neighbor ripples. Poppies use slower attacks, lower filter cutoffs, and less FM modulation. Visual envelopes are aligned with the scheduled audio onset and approximate its exponential decay.
- `studies.js`: names, specimen labels, lighting colors, pollen modes, and a pure local-date calendar selector. The garden checks for a changed month once a minute, on window focus, on tab visibility restoration, and when navigating between portfolio views. Manual overrides remain selected across date changes.
- `pollen.js`: a bounded 384-particle pool and one GPU point draw, with a single generated glyph atlas. Particles start at the moving flower center, spiral upward for lilies or drift in a wider, slower fan for poppies, and fade over 2.6–4.2 seconds. Roughly 80% of characters are bright yellow and 20% sunset orange, with orange glitch echoes. Depth testing lets petals occlude pollen. No per-frame canvas texture uploads or DOM particles are needed; pause, replanting, study changes, hidden tabs, and portfolio navigation clear the pool.
- `main.js`: seeded planting, synthetic environment lighting, scene setup, interactions, and one lightweight postprocessing pass. Hidden tabs and portfolio views rest the garden; pausing clears transient motion.
- `style.css`: responsive HTML overlay, independent of the WebGL canvas.
- `site.js` and `portfolio.css`: accessible portfolio navigation, a six-project accordion, an introduction, the existing résumé link, and contact details. Project content was originally migrated from `js/functions.js`; the pixel-art entry has since been updated to SharePix using its repository description and link. The résumé URL comes from `js/sketch.js`.

The scene requires WebGL 2. Initialization failure presents a readable fallback; the HTML portfolio remains usable. No tracking, microphone access, or backend is involved.

## Verification

```sh
node --test prototype/garden.test.mjs
```

Sixteen focused tests cover normalized gestures, stable timbres, envelope timing, frame-rate-independent spring motion, ripple propagation, both species' geometry and drawing complexity, anchored deformation, bounded pollen lifetimes, consistent hover emission, world-space pollen origins, distinct poppy timbres, study fallback, season boundaries, and manual calendar overrides. Browser checks cover audio startup and its eight-voice limit, keyboard play, pointer expression, a fully static pause, replanting, study switching, navigation, session persistence, and the phone layout.

The calendar release versions its entry point, calendar module, and portfolio stylesheet with `calendar-garden-1`; the pollen import retains `sunset-pollen-1`, and other seasonal modules retain `seasonal-study-1` so returning visitors load the correct dependencies.

## Next design decisions

Tune the seasonal lighting and the two flowers' silhouettes, pollen motion, and sound. More individual monthly species can join the art calendar as they are developed.
