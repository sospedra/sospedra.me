# Bazaar reverse hover animations implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hover sprites in /bazaar play their frames backward on hover or focus loss instead of snapping to rest.

**Architecture:** The nine r17 stalls get a bidirectional pose stepper in `scene-stall.tsx`. A ref tracks the pose step across `active` flips, so exits reverse from the current frame. The street door gets a `closing` class in `bazaar-view.tsx` and reverse-relay CSS rules that reuse the existing keyframes.

**Tech Stack:** React 19 client components, CSS modules, node --test via tsx.

Spec: `docs/superpowers/specs/2026-08-05-bazaar-reverse-hover-design.md`.

## Global constraints

- No new assets. No manifest changes. No new dependencies.
- Reduced motion keeps instant swaps everywhere.
- The bus shelter bulb stays a snap (user call).
- Commit style: single commit at the end, subject only, no body.
- Test note: the repo has no DOM component harness (node --test only). The stepper adds no new data contract, so verification is the existing suite, tsc, biome, and a CDP visual pass.

---

### Task 1: bidirectional pose stepper in scene-stall.tsx

**Files:**
- Modify: `apps/main/app/bazaar/scene-stall.tsx`

**Interfaces:**
- Consumes: `StallLayer`, `hoverStepFile`, `loopFrames`, `schedule`, `restFile` (all already in the file).
- Produces: no exported API change. `SceneStall(props)` signature stays.

- [x] **Step 1: add the rest sentinel and extend LayerContext**

Below `const HOVER_STEP_MS = 150` add:

```ts
const REST_STEP = -1
```

Replace the `LayerContext` type with:

```ts
type LayerContext = {
  active: boolean
  layers: StallLayer[]
  show: (index: number, file: string) => void
  timers: Timers
  step: { current: number }
  reversing: boolean
  hasChar: boolean
}
```

- [x] **Step 2: replace `greet` with `showPose`, `settle`, and `stepPose`**

Delete the `greet` function. In its place:

```ts
const showPose = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
  step: number,
) => {
  ctx.show(index, layer.hover[step].file)
  for (const [otherIndex, other] of ctx.layers.entries()) {
    if (other.role === 'prop' && other.hover) {
      ctx.show(otherIndex, hoverStepFile(other.hover, step) ?? other.rest)
    }
    if (other.role === 'effect' && other.hover) {
      ctx.show(
        otherIndex,
        hoverStepFile(other.hover, step) ?? other.frames[0].file,
      )
    }
  }
}

const settle = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
) => {
  ctx.step.current = REST_STEP
  loopFrames(ctx.timers, layer.idle, (file) => ctx.show(index, file))
  for (const [otherIndex, other] of ctx.layers.entries()) {
    if (other.role === 'prop') ctx.show(otherIndex, other.rest)
    if (other.role === 'effect' && other.hover) {
      loopFrames(ctx.timers, other.frames, (file) => ctx.show(otherIndex, file))
    }
  }
}

const stepPose = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
  step: number,
) => {
  if (step === REST_STEP) {
    settle(layer, index, ctx)
    return
  }
  ctx.step.current = step
  showPose(layer, index, ctx, step)
  const target = ctx.active ? layer.hover.length - 1 : REST_STEP
  if (step === target) return
  const next = step + (target > step ? 1 : -1)
  schedule(ctx.timers, () => stepPose(layer, index, ctx, next), HOVER_STEP_MS)
}
```

- [x] **Step 3: rewrite the role drivers**

Replace the `effect`, `prop`, and `char` drivers inside `ROLE_DRIVERS`:

```ts
  effect: (layer, index, ctx) => {
    if (!layer.hover || (!ctx.active && !ctx.hasChar)) {
      loopFrames(ctx.timers, layer.frames, (file) => ctx.show(index, file))
      return
    }
    if (ctx.active) {
      ctx.show(index, hoverStepFile(layer.hover, 0) ?? restFile(layer))
    }
  },
  prop: (layer, index, ctx) => {
    if (!ctx.active && !ctx.reversing) ctx.show(index, layer.rest)
  },
  char: (layer, index, ctx) => {
    if (ctx.active) {
      const start = ctx.step.current === REST_STEP ? 0 : ctx.step.current
      stepPose(layer, index, ctx, start)
      return
    }
    if (ctx.step.current === REST_STEP) {
      settle(layer, index, ctx)
      return
    }
    stepPose(layer, index, ctx, ctx.step.current - 1)
  },
```

Behavior notes the implementer must keep:
- An inactive effect layer with `hover` defers its loop restart to `settle` when the scene has a char. No manifest effect uses `hover` today, but the capability stays symmetric.
- A re-run while active and held (breakpoint tick) re-shows the last frame and stops. Today it replays the whole greet. The new behavior is intentional.

- [x] **Step 4: thread the step ref through the component**

In `SceneStall`, next to `imgRefs`, add:

```ts
const stepRef = useRef(REST_STEP)
```

In the layout effect, replace the `ctx` construction with:

```ts
const ctx: LayerContext = {
  active,
  layers,
  show,
  timers,
  step: stepRef,
  reversing: !active && stepRef.current !== REST_STEP,
  hasChar: layers.some((layer) => layer.role === 'char'),
}
```

`reversing` must read `stepRef.current` before any driver runs. Drivers mutate the ref synchronously.

Replace the reduced-motion branch inside the driver loop with:

```ts
if (reduced) {
  show(index, reducedFile(layer, active))
  if (layer.role === 'char') {
    stepRef.current = active ? layer.hover.length - 1 : REST_STEP
  }
  continue
}
```

The ref write keeps the pose state truthful across fx-quiet toggles, so a later exit cannot replay a stale reverse.

- [x] **Step 5: gates**

Run: `pnpm --dir apps/main exec tsx --test app/bazaar/stall-data.test.ts`
Expected: all pass.
Run: `pnpm --dir apps/main typecheck`
Expected: exit 0.
Run: `pnpm --dir apps/main lint`
Expected: exit 0.

### Task 2: door closing phase

**Files:**
- Modify: `apps/main/app/bazaar/bazaar-view.tsx` (door button, around line 72)
- Modify: `apps/main/app/bazaar/scene.module.css` (after the `.sDoor:hover` block, around line 284)

**Interfaces:**
- Consumes: `scene.sDoor` styles, existing `seqOut` and `seqEnd` keyframes.
- Produces: new CSS module class `sDoorClosing`.

- [x] **Step 1: armed state on the door button**

In `StreetFloor` add:

```ts
const [doorArmed, setDoorArmed] = useState(false)
```

`useState` is already imported. Update the button:

```tsx
className={cn(scene.hit, scene.sDoor, doorArmed && scene.sDoorArmed)}
onMouseEnter={() => {
  setDoorArmed(true)
  sfx.hover()
}}
```

The initial value is false, so first paint carries no closing animation and no load glitch. Arm on enter, never on leave: a leave-time write lands one render late and the CDP probe measured a 60 ms closed-door flash with that shape. The armed class waits behind `:not(:hover)` and fires the same frame hover drops.

- [x] **Step 2: closing rules in scene.module.css**

After the `.sDoor:hover img[data-frame='2']` rule add:

```css
/* leave: the door swings back through the half-open frame */
.sDoorArmed:not(:hover) img:first-child {
  animation: seqEnd 0.28s steps(1, end) forwards;
}

.sDoorArmed:not(:hover) img[data-frame='1'] {
  animation: seqOut 0.28s steps(1, end) forwards;
}
```

Notes the implementer must keep:
- Frame 2 needs no rule. The base `.sDoor img[data-frame]` opacity 0 hides it the instant the hover animations drop.
- `seqEnd` and `seqOut` are duration-agnostic. At 0.28 s they mirror the open relay: frame 1 visible for 0.28 s, base door back after.
- The `forwards` end state equals the static closed door, so the class may persist until the next hover.
- `:not(:hover)` lets an immediate re-hover win without waiting for the React re-render.
- The reduced-motion block at the file end already forces `animation: none` over these rules. Keep the new rules above it.

- [x] **Step 3: gates**

Run: `pnpm --dir apps/main typecheck`
Expected: exit 0.
Run: `pnpm --dir apps/main lint`
Expected: exit 0.

### Task 3: visual verification

**Files:** none in the repo. Scratch script in /tmp only.

- [x] **Step 1: dev server**

Run: `pnpm --dir apps/main dev` in the background. Wait for ready on the printed port.

- [x] **Step 2: CDP reverse pass on a stall**

Headless Chrome against `/bazaar`. Dispatch a mouse move onto a stall char hitbox, hold 800 ms (full greet), move the pointer off, and capture screenshots at about +75 ms, +225 ms, +375 ms, +700 ms. Expected: the three mid captures show distinct hover frames walking back, the last shows the idle pose. A snap (identical mid captures already at idle) fails the task.

- [x] **Step 3: CDP reverse pass on the door**

Same session on the street view. Hover the door 800 ms, move off, capture at about +100 ms and +400 ms. Expected: the first capture shows the half-open frame, the second shows the closed door. Also reload the street cold and capture at once: the door must sit closed with no animation on first paint.

### Task 4: commit

- [x] **Step 1: single commit, subject only, explicit paths**

```bash
git add apps/main/app/bazaar/scene-stall.tsx apps/main/app/bazaar/bazaar-view.tsx apps/main/app/bazaar/scene.module.css docs/superpowers/specs/2026-08-05-bazaar-reverse-hover-design.md docs/superpowers/plans/2026-08-05-bazaar-reverse-hover.md
git commit -m "feat(bazaar): reverse hover animations on stalls and street door"
```

Sibling sessions edit this repo in parallel. Never `git add -A`.
