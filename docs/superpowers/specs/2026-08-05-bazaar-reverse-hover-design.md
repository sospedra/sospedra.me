# Bazaar reverse hover animations

Date: 2026-08-05
Status: approved (scope: stalls + door, bulb excluded)

## Problem

Every hover sprite in /bazaar plays forward and holds. Exit snaps it to rest.

1. Stall characters and lockstep props. `scene-stall.tsx` restarts the idle loop when `active` goes false. The hover frames never step back.
2. Street door. `scene.module.css` animates three frames on `:hover`. Hover loss removes the animation and the door snaps shut.

## Scope

In: the nine r17 stalls and the street door.
Out: the bus shelter bulb (stays a snap, user call). The brightness lift and glow wash (symmetric snaps by design). Reduced motion (a snap is the correct behavior there).

## Design

### Stalls: bidirectional pose stepper

`scene-stall.tsx` replaces the one-way `greet` with a stepper that walks toward a target.

- A ref holds the pose step across `active` flips. Value `-1` means rest. Values `0..last` mean hover frame `step` is on screen.
- Activation walks up from the current step to the last hover frame at 150 ms per step, then holds. From rest it enters at step 0, same as today.
- Deactivation shows `step - 1` at once, walks down at 100 ms per step, and settles after step 0. The exit paces quicker than the entrance on purpose: a mirrored cadence reads as no reverse at all (user feedback, 2026-08-05).
- Settle = show prop rests, restart hover-effect frame loops, restart the char idle loop.
- Re-entry mid-reverse turns around from the current step. Exit mid-greet reverses from the current step.
- The prop driver skips its rest snap when a reverse is in flight. The settle pass shows the rests instead.
- Effect layers with a `hover` field defer their loop restart to the settle pass when the scene has a char. No manifest effect uses `hover` today.
- Reduced motion keeps the instant swap. The reduced branch also sets the ref (`last` when active, `-1` when not), so a mid-session fx-quiet toggle cannot replay a stale reverse.

Timings: full reverse from hold is 300 ms (h3, h2, h1, then idle) against the 450 ms forward walk. No new assets. No manifest change.

### Door: armed closing phase

`bazaar-view.tsx` adds one boolean state on the door button. The first mouse enter arms it, and it stays armed. The initial value is false, so first paint has no animation and no load glitch.

Arming on enter instead of leave is deliberate. The close must start the same frame `:hover` drops. A leave-time state write lands one React render late, and the measured cost was a 60 ms closed-door flash before the half-open frame.

`scene.module.css` adds a `sDoorArmed` block guarded with `:not(:hover)`. While hovered the block is dormant. The instant hover drops:

- frame 2 goes to opacity 0 at once
- frame 1 plays `seqOut` at 0.28 s (visible, then off)
- the base door plays `seqEnd` at 0.28 s (hidden, then back)

Both keyframes already exist. Keyframes are duration-agnostic, so the block reuses them at 0.28 s. The `forwards` end state equals the static closed door, so the class persists safely. Re-hover mid-close replays the open sequence from the closed frame, same quality as today. A sub-60 ms first swipe may miss the arming render, and that is harmless: such a hover never reaches the first open frame. The reduced-motion block at the end of the file already forces `animation: none` over these rules.

## Verification

1. `node --test` ride-along for the bazaar suite stays green.
2. `tsc` and biome stay green.
3. Visual pass on localhost with headless Chrome and CDP: hover a stall, move off, capture frames at reverse mid-points, and confirm h3/h2/h1 land before idle. Same pass for the door.
