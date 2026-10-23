# Emberline

A one-button momentum game about falling, and holding on.

You are a living ember loose in a bioluminescent cavern. **Hold** to fire a tether at the
nearest pyre and swing. **Release** to fly. Gather motes of light to feed your flame while the
Gloom eats the cave behind you.

No dependencies, no build step, no image or audio assets — one canvas, three files.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Tether / swing | hold anywhere | hold `Space` · `↑` · `Enter` |
| Let go / fly | release | release |
| Pause | `❚❚` button | `P` or `Esc` |
| Mute | `♪` button | `M` |

The game starts the moment you first hold — your ember hovers and waits for you. On a phone held
upright, a short prompt suggests landscape (you can dismiss it and play anyway).

## How it works

- **Momentum, not thrust.** There is no jump button. Speed comes from gravity, from the length
  of your rope, and from releasing at the right angle. Releasing while rising and moving forward
  at roughly 25–50° is the shot that carries you to the next pyre.
- **The tether reels in.** While you hold, the rope shortens and pulls you into a tighter, faster
  arc. It also nudges a dead hang into a forward swing, so you never get stuck dangling — but
  hanging around still lets the Gloom close in.
- **Your flame is fuel.** The ember meter drains constantly, faster the deeper you get. Motes
  refill it. They are deliberately scattered high, mid and low, so collecting them costs you a
  line you have to commit to.
- **The roof scrapes, the floor kills.** Clipping the cavern roof sparks and costs a little
  light; it won't end your run. Hitting the ground will. The Gloom is a rubber band — it surges
  when you stall and falls back when you fly.
- **It gets harder.** Over the first ~1,700 m the cave narrows, pyres drift apart, and more of
  them start moving. Spacing is guaranteed to stay reachable; the challenge is your line, not
  the level generator.

Distance is measured in metres, best runs are stored in `localStorage`, and the death screen
tells you which of the three things got you.

## Under the hood

| File | What's in it |
| --- | --- |
| `index.html` | Markup, title/death/pause overlays, favicon |
| `style.css` | HUD, overlays, responsive layout, reduced-motion support |
| `game.js` | Fixed-timestep loop, rope physics, procedural cave, particles, Web Audio |

A few implementation notes:

- **Fixed 120 Hz physics** with accumulator stepping, decoupled from render. Rendering scales the
  world to fit the viewport (a 720-unit-tall virtual cave), so gameplay is identical on a phone
  and a ultrawide monitor, and the visible width never drops below 820 world units.
- **Rope constraint**: position clamp to the rope radius plus removal of radial velocity, with an
  angular-momentum-style speed-up as the reel shortens. A separate tangential assist keeps a
  stationary hang from becoming a soft-lock.
- **Procedural cave**: a summed-sine envelope plus seeded smoothing for floor and ceiling, with
  hard clamps that guarantee a minimum corridor height. A slower parallax layer with stalactites
  sits behind the play space for depth. Terrain, pyres and motes are generated ahead of the camera
  and culled behind it.
- **Rock material** comes from a tiled noise/fissure pattern generated once at boot and clipped to
  the cave silhouette, plus per-segment crystal sprites placed from a deterministic hash so they
  don't shimmer between frames.
- **Glow without assets**: every light is a cached radial-gradient sprite composited with
  `lighter`, so the whole game is a handful of `drawImage` calls per light.
- **Audio is synthesized**: a four-oscillator drone pad plus sine/noise one-shots, all built at
  runtime from a `GainNode` graph. It initializes on the first user gesture and can be muted
  (`M`), with the preference persisted.

Performance is light: game logic runs at ~0.2 ms per 60 fps frame with flat memory, and the
particle field is capped. Rendering honors `prefers-reduced-motion` for overlay animations.

## Tips

- Release *early* — the moment you're rising and pointing forward, not at the top of the arc.
- A rope that stays long is a slow, wide, safe swing. Reel in for speed and height.
- Motes near the floor and the roof are worth the detour only when your meter is low.
- If the Gloom is visible at the edge of the screen, stop sightseeing.
