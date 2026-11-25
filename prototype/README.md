# Unlikely Garden · studies 001–004

A garden and portfolio for Evelyn Wu: four seasonal studies of 18 procedural chrome flowers, colored studio reflections, synthesized tones, and localized visual glitches. Garden, Work, About, and Contact views share the same scene. The production homepage is the root `index.html`; this folder holds its assets. The previous portfolio is preserved at `/archive/`, and old `/prototype/` links redirect to the homepage with their fragment intact.

## Preview

From the repository root, run:

```sh
node prototype/serve.mjs
```

Open http://127.0.0.1:4173/. No package installation or build is needed. Pinned browser libraries are vendored locally: Three.js 0.180.0 and Tone.js 15.1.22. The monospace font is reused from the existing portfolio; headings use the locally hosted Instrument Serif.

## Interact

- The header switches between English, Simplified Chinese, and Japanese. Share any tab with `?lang=en`, `?lang=zh-Hans`, or `?lang=ja` before the tab hash. Language changes keep the garden and the expanded project in place.
- Click **Enable sound**, then hover over flower heads. On a phone, tap them.
- **Seasonal garden** uses the visitor’s local month and a Northern Hemisphere calendar. Spring poppies (March–May) sit against a lavender sky, summer lilies (June–August) against violet, autumn chrysanthemums (September–November) against dusty rose and plum, and winter snowdrops (December–February) against a pale peach sunset. The season buttons preview the corresponding flowers and palette. The preview survives reloads in the same tab. **Now** returns to the current season.
- Poppies have four overlapping, crumpled petals with curled edges, fine radial grain, sage markings, a small seed pod, and 56 irregular golden stamens. Lobed leaves and varied flower tilt distinguish their silhouette. They use softer A pentatonic tones and sunset-colored ASCII seeds drifting outward. Changing species releases active voices, clears pollen, and replants the same field seed; switching modes within the same species keeps the scene intact. Sound stays opt-in and the motion preference is preserved.
- Winter snowdrops have spoon-shaped outer petals and jade-marked inner bells. Their higher glass tones and sparse golden pollen accompany the pale sunset and drifting ASCII snow. Autumn chrysanthemums have five tiers of curled pearl petals, spiraled florets, and plucked G pentatonic tones.
- Grass ranges from vivid lime in spring to meadow green in summer, dry gold in autumn, and frosted sage in winter. Winter has ivory and ice-blue ASCII snow that freezes with **Pause motion** or reduced motion.
- Gentle pointer movements produce softer, darker bells; faster sweeps increase brightness and intensity. Each flower is a soft synth pluck with its own rounded waveform (sine, triangle, or a two-partial square). Notes start on the season's next free pulse (a sixteenth of 0.15–0.19 s, 80–100 beats per minute), so a sweep lands as a phrase, and the echo is tuned to two pulses. While sound is on, a quiet machine plays a sparse sixteen-step pattern per season on the same pulse: a soft low kick, a brushed tick, a faint hat, and a music-box line of three alternating FM bells in the octaves above middle C. The bells play steps of the season's pentatonic scale, move with the chord by the same scale steps as the flowers, and share the flowers' echo and reverb; the drums bypass the garden's high-pass filter. With sound on, the drone moves to a new root every 64 pulses through a four-chord cycle and each flower shifts by a few scale steps with it, staying inside the season's pentatonic scale; with sound off, flowers keep their home notes. A gesture also sends a small, delayed ripple through nearby flowers.
- Hovering releases mainly bright yellow ASCII pollen, with occasional sunset-orange characters and orange glitch echoes, from the stamens: an arrival burst followed by a drifting spiral while you linger. Taps and keyboard play also release bursts. The visual works with sound disabled, and lingering never repeats the audio.
- Focus the garden with Tab. Arrow keys select and play flowers; Space or Enter replays the selected flower. Sound still requires the explicit Enable sound button.
- Each flower has a seeded distortion level that shapes its chromatic split, movement, and ASCII pollen glitch.
- **Replant** changes the flowers' proportions, tilt, placement, and distortion while preserving their musical identities.
- The planting forms loose groups with open clearings, a prominent lead bloom, foreground framing flowers, and smaller distant drifts. Seasonal distance haze leaves the nearest flowers clear. Grass gathers around the planting, and soft contact shadows ground the stems.
- The pearl finish uses the snowdrop’s white petals, cool lighting, and muted green and gold accents across all four studies. Roughness, bump, and occlusion maps define the petal rims and folds, with separate grain for lilies, poppies, and snowdrops.
- Broken lime and violet traces, ASCII marks, and fragmented root rings fill the ground. Marks near a flower inherit its distortion. Playing a flower sends an expanding ripple from its base, including with sound off. Pause and reduced motion leave a static ground texture. Navigation and replanting clear active ripples.
- **Pause motion** disables wind, parallax, animated deformation, glitch bursts, and pollen. The operating system's reduced-motion preference is respected initially and when it changes.
- Audio is muted and active voices are released while the tab is hidden.
- The navigation links switch views without reloading the garden. Hash URLs support direct links and browser back/forward. Opening a portfolio view rests the audio and rendering until you return to the garden.
- Work includes real previews for all seven projects. Above 900 px, the selected project's image appears beneath the introduction and changes when a different entry opens. On smaller screens it appears inside the expanded entry. Preview images link to the existing demo or repository; video playback remains on Drive. A brief transition respects reduced motion, and closing every entry retains the last desktop preview.

## Implementation

- `flowers.js`: shared thick petal variants for six-petal lilies and four-petal poppies, brushed roughness, asymmetric planting, and analytically bent stems. Leaves, petals, and heads have independent movement; poppies flutter more loosely. Batched filaments and instanced anthers keep both species at no more than 13 visible draw objects per flower. Shared assets survive study changes; each replaced flower's private geometry and instance buffers are disposed. Invisible head meshes follow the bloom for picking.
- `petal-surfaces.js`: deterministic PBR maps aligned with the existing petal UVs. Rims and tips are smoother than the body, fine longitudinal bump grain supplies the brushed texture, and mild occlusion deepens the root and central crease. Separate maps keep each species' character. Three shared 128-by-256 textures per species total about 1.125 MiB before mipmaps and add no render objects or downloaded assets. All maps use linear data and mipmap filtering; the existing Standard materials, petal geometry, and color palette are retained.
- `snowdrops.js`: three shared outer petal variants with rounded tips and longitudinal ridges, a shorter notched inner skirt with green V markings, six gold anthers, strap leaves, and varied arched stems. The outer petals open to reveal the inner flower. Pendants follow the same anchored deformation as the other species, with slower petal motion and a small pendulum sway. Snowdrops use 12 visible draw objects per flower; picking follows the hanging bloom. Only the stem and merged filaments are private geometry, disposed on replanting.
- `audio.js`: eight reusable lead voices, a drum machine and bass sequencer scheduled just ahead of the audio clock, with per-note stereo panning and filtering, per-flower cooldown, D minor pentatonic notes for lilies, a lower A minor pentatonic palette for poppies, and a quieter octave-higher D palette for snowdrops. Shared delay, reverb, conservative gain, and a limiter keep the field controlled. New timbre settings apply only to free voices, preserving notes already ringing. Synthesis runs locally; there are no recorded samples or network audio requests.
- `expressions.js`: gesture normalization, stable flower characters, shared audio/visual envelope parameters, frame-rate-independent springs, and delayed neighbor ripples. Poppies use slower attacks, lower filter cutoffs, and less FM modulation. Visual envelopes are aligned with the scheduled audio onset and approximate its exponential decay.
- `studies.js`: names, specimen labels, shared bloom lighting, pollen modes, and a pure local-date calendar selector. Each study defines the flower, sky, fog, and ground colors for its season. The garden checks for a changed month once a minute, on window focus, on tab visibility restoration, and when navigating between portfolio views. Manual overrides remain selected across date changes.
- `pollen.js`: a bounded 384-particle pool and one GPU point draw, with a single generated glyph atlas. Particles start at the moving flower center, spiral upward for lilies or drift in a wider, slower fan for poppies, and fade over 2.6–4.2 seconds. Snowdrops emit fewer, smaller particles below the bell with an outward curl, a slower rise, and a 3.7–5.3 second lifetime. As they ascend, characters smoothly shrink to 22% of their initial size. Shrinking is applied after the perspective-size clamp, so distant glyphs can still taper down. Roughly 80% of characters are bright yellow and 20% sunset orange, with orange glitch echoes. Depth testing lets petals occlude pollen. No per-frame canvas texture uploads or DOM particles are needed; pause, replanting, study changes, hidden tabs, and portfolio navigation clear the pool.
- `main.js`: seeded planting, synthetic environment lighting, scene setup, interactions, and one lightweight postprocessing pass. Hidden tabs and portfolio views rest the garden; pausing clears transient motion.
- `composition.js`: deterministic clusters of 18 flowers, 220 grass instances concentrated around their roots, and a near-to-far atmosphere using Three.js's built-in linear fog. The foreground stays outside the haze; distant flowers recede into the seasonal haze. Contact shadows use one reused instanced plane mesh and a single generated 64-pixel texture, adding one draw call without shadow maps or another postprocessing pass. Replanting updates instance matrices and bounds; animation does not regenerate these assets.
- `ground-signals.js`: a single instanced draw for 260 broken traces, 110 ASCII marks, and 18 root rings. A generated 64-by-8 pixel atlas supplies eight font-independent glyphs. The additive layer sits above the ground, respects opaque geometry, fades with distance, and reacts to flower gestures. Attribute buffers and the atlas are reused on replanting; animation only changes uniforms. Pause freezes the shader clock and disables flicker and pulses. No additional postprocessing pass or downloaded textures are needed.
- `style.css`: responsive HTML overlay, independent of the WebGL canvas.
- `site.js` and `portfolio.css`: accessible portfolio navigation, a seven-project accordion, an introduction, the existing résumé link, and contact details. Project content was originally migrated from `archive/js/functions.js`; the pixel-art entry has since been updated to SharePix using its repository description and link. Randforest links to its demo video and describes furniture crafting, foraging, and Perlin-noise weather. The résumé URL comes from `archive/js/sketch.js`.
- `project-previews.js`: moves each original preview figure between its project and the desktop preview area. Native details elements still work without JavaScript, with images inline. Existing order, numbering, links, and single-open behavior are preserved. `projects/` contains seven optimized WebP images totaling about 330 KB, plus source attribution. No video files or additional runtime libraries are required.

### Scene depth pass

- Resolution: the render budget is 4.2 million pixels (up to 1.65x on desktop, 1.5x on phones) with 4x MSAA. If frames average above 40 ms the buffer steps down by 20% at a time, to no less than about half.
- Flowers: lily tepals have a rounded midrib, recurved tips, ruffled margins, two whorls, and individually turned anthers; the lily keeps its chrome finish. Stems taper from soil to bloom, and upright blooms sit in a small calyx (one more draw per flower: 14 lily, 12 poppy, 10 chrysanthemum). Chrysanthemum petals are solid and write depth, thinning to translucent only at the tips. Flowers behind z = -6 use coarser petal meshes.
- Meadow: 2,600 half-transparent instanced blades (55% of that on phones) bend in the vertex shader with a position-based gust phase. Contact shadows are stronger.
- Atmosphere: each season gets its own prefiltered environment, washed with its sky, glow, and ground colors; fog is tinted toward the horizon color.
- Lens: a half-resolution blur feeds depth of field focused on the selected flower, and a quarter-resolution bloom spreads highlights. The camera drifts slowly and leans toward a played flower. Pause and reduced motion hold the camera still.

### Autumn and horizon pass

- Chrysanthemums: the head is 1.5x scale; blooms rotate through pearl, blush, and pale lilac; petals have veins, a lilac-rose blush at the base, and a warm glow on the translucent tips and grazing edges; the gold centre has 34 florets and a slight glow. Autumn bloom strength is 0.72 of the other seasons.
- Falling petals: a second `SeasonalParticles` layer (the `Petals` preset, shown only in autumn) drifts 84 pink, gold, and lilac glyphs beside the rain. It uses the snow motion and a fifth row of the glyph atlas.
- Ground marks take two colors from each study (`signals`): lime and violet in spring and summer, gold and rose in autumn, ice blue and lilac in winter.
- Horizon: two translucent ridge crests sit beyond the field and fade out downward. `groundHeight` in `composition.js` keeps the foreground level and rolls the ground upward behind z = -5; flowers, grass, shadows, and ground marks follow it. Floor normals stay vertical so the slope keeps the season's ground color.

### Winter pass

- Palette: a blue-violet dusk sky and dark blue ground, with the peach glow as the only warm color; bloom strength is 0.68 of the default.
- Frost (`frost: 1` on the study): grass blades whiten toward their tips, and the floor shader adds pale drifts and small twinkling ice glints near the camera.
- Clumps: each snowdrop has two smaller companions (one for distant flowers) built from three shared pieces — an arched stem, a closed bell of merged outer petals, and the cap — plus a leaf. A full plant is 20 draws.
- Snowfall: the second particle layer shows the `NearSnow` preset in winter, 30 large soft flakes between the camera and the lead bloom.

### Spring, summer, and lighting pass

- Lighting: each study sets its own key and fill colors and a `keyFrom` position, so blooms are lit from the bright side of their sky — warm morning sun in spring, moonlight in summer, a low pink sun in autumn, and a peach sun against a blue fill in winter. The ground keeps only 15% of the direct specular, because a key light behind the field otherwise flares across it.
- Light shafts (`beams` on each study): seven long additive quads at different depths lean with the light and are cut by the flowers in front of them. Color, strength, and angle are per season; autumn's lie nearly flat.
- Spring: a paler lavender morning sky, lime new growth on the grass tips, dew glints on the ground, rising pale fluff (the `Seeds` particle preset), and a bloom strength of 0.8. Poppy petals blush pink toward the rim and glow at grazing angles.
- Summer: an indigo night with stars in the sky shader, moonlit grass tips, and larger fireflies near the camera (`NearFireflies`). Lily tepals carry dark speckles toward the throat.
- Buds: lilies and poppies have two unopened buds beside each plant (one for distant flowers), each a single merged stem-and-bud mesh with a small leaf. Per plant: 18 draws for a lily, 16 for a poppy.

### Performance pass

Measured with a GPU timer query on a 2376 by 1485 buffer, the frame is GPU-bound: roughly a third of the GPU time is the 4x multisampled HDR scene target, about 16% the grass, about 15% the flowers, and about 9% the six blur passes. Script time per frame is 1.5 to 3.5 ms.

- The canvas is created without its own antialiasing or depth buffer: it only receives the full-screen post quad, and the scene is antialiased in the render target.
- The sky dome draws after the other opaque meshes, so pixels behind flowers skip its shader (about 5% of GPU time).
- When frames stay slow, the scene first drops from 4 to 2 antialiasing samples and only then lowers resolution; the sample step saves about as much as one 20% resolution step and costs far less sharpness.
- Petal meshes, petal textures, and petal materials are built on first use (`lazy` in `flowers.js`), and snowdrop assets are created when winter is first shown. Startup no longer builds the three species that are not on screen; on the test machine that is roughly 40 ms less geometry work.
- Tone.js is no longer a script tag. `loadSoundLibrary` in `audio.js` requests it once the garden is idle; enabling sound waits for it only if the visitor clicks first.

### Chrome pass

All four species now share the lily's mirror finish. The shared `pearlFinish` (snowdrops and chrysanthemums) is fully metallic with roughness 0.22 and reflection strength 1.9; poppies are fully metallic with roughness 0.26 and reflection strength 2; the snowdrop's jade-marked inner bell is 0.92 metallic with roughness 0.3. Petal colors, the chrysanthemum's translucent tips, and each season's reflected sky are unchanged, so each species picks up its own season's colors.

### Phone layout pass

- Phones (600 px wide or less) keep the season switch as a slim row ("Now" without the flower name) at the very bottom, below one unboxed row of controls: sound with its label on the left, pause and replant as icons on the right, each with a 44 px touch target. The pause label stays in the page for screen readers. The footer appears on the garden page only and has no rule above it at any size.
- The name, the navigation, and the language links share one centre line; on phones the navigation sits in its own row directly under the name, with no rule between them.
- The opening title is not shown on phones; it stays in the page for screen readers.
- On every layout the instructions above the footer fade once a flower has been clicked or tapped (`data-flower-picked` on `body`); hovering and keyboard play leave them up.
- On phones 700 px tall or less the navigation row and the content below it sit 6–8 px higher.

The scene requires WebGL 2. Initialization failure presents a readable fallback; the HTML portfolio remains usable. No tracking, microphone access, or backend is involved.

## Verification

```sh
npm test
```

This runs `node --test prototype/garden.test.mjs` with Node's built-in runner (Node 20 or later, no dependencies to install). The same command runs on every push and pull request through `.github/workflows/test.yml`.

Sixty-five focused tests cover the pulse grid and its queue limit, the drum and music-box sequence, in-scale harmony for every chord, the chord clock, normalized gestures, stable timbres, envelope timing, frame-rate-independent spring motion, ripple propagation, all species' geometry and drawing complexity, anchored deformation, bounded pollen lifetimes, consistent hover emission, world-space pollen origins, distinct species timbres, the snowdrop arch and pendant, sparse winter pollen, study fallback, season boundaries, and manual calendar overrides. Surface checks cover smoother rims and tips, fold occlusion, linear texture data, repeatable grain, shared maps, bounded memory, and roughness ranges. Composition checks cover deterministic spacing across 100 seeds, camera projections and focal picking for all four species at four viewport sizes, foreground versus distant haze, clustered grass, and grounded shadow asset reuse. Ground-signal checks cover bounded seeded marks, root ring alignment, single-draw resource reuse, pause and ripple resets, and glyph atlas gutters. Earlier browser checks cover audio startup and its eight-voice limit, keyboard play, pointer expression, a fully static pause, replanting, study switching, navigation, session persistence, and the phone layout.

The seasonal pass versions the entry point and changed garden modules with `four-seasons-1`. The portfolio stylesheet uses the same version for its updated selector.

The preview interaction was checked in a temporary DOM environment for all seven selections, single-open behavior, mobile and desktop placement, repeated resizing, retained selection, reduced motion, navigation, and cleanup. All seven image files were inspected. Browser layout verification was unavailable for this pass; served-file checks verify that all preview assets resolve.

The depth pass uses built-in fog and standard instanced materials. WebGL browser rendering verification was unavailable for this pass; projection, raycasting, resource reuse, and served-module checks run locally.

The ground vertex and fragment shaders were adapted to desktop GLSL syntax for an offscreen OpenGL compilation, link, and instanced-rendering check. Animation changed the rendered frame, and repeated paused frames were identical. The isolated ground layer was visually inspected. Full in-browser rendering verification was unavailable for this pass.

For the chrome-finish pass, Three.js's expanded Standard material shader was adapted to desktop GLSL syntax and compiled/linked offscreen with roughness, bump, occlusion, UV0, double-sided petals, and three directional lights. The procedural surface maps were visually inspected. Full in-browser rendering verification was unavailable.
