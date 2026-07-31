# r17h order — CONSOLE hover rebuild (translation law)

DEPENDENCY: this order runs AFTER the console master is re-locked and
r17/console/ is re-extracted against the new static. Do not run it
against stale layers — check that r17/console/plate.png is newer than
the new locked static before starting; if the re-extraction has not
happened, perform it first (extract + inpaint + idle + fx per the
original prompts/r17-console.md, THEN this hover spec replaces its
hover section).

READ FIRST: r17/DOCTRINE.md, then r17/HOVER-DOCTRINE.md, then
r17/author-hover.mjs (papers pilot). Work only in r17/console/.

The old hover synthesized a peace sign — REJECTED. New read: head up
to you → his resting hand rises → held high beside his head in
greeting → nod and grin.

## Groups to probe first (debug crops mandatory)

- HEAD: Ed's head + the whole red dread mass + visor, above the
  shoulders.
- ARM: his right hand + forearm + upper arm as ONE group, from the
  hand on his knee up to a boundary INSIDE the shoulder/tank (the
  trailing edge must overlap his own tank/skin when the group
  moves).
- The visor cable: include its head-attached segment in HEAD if it
  visually hangs from the visor (probe it).

## Frames (150ms each, h4 held)

- h1 HEAD UP: HEAD translates up 6 (neck seam duplicates his
  existing neck row); any lit visor pixels swap one palette step
  brighter.
- h2 HAND RISES: ARM translates up 16 — his open hand leaves the
  knee. The vacated knee zone fills by continuing his own shorts/leg
  rows (interior vacancy fill). Trailing boundary overlaps the
  shoulder.
- h3 GREETING: ARM translates up a further 14 (total 30) — the open
  hand beside his head, a raised-hand hello with HIS OWN existing
  hand pixels, no new fingers ever.
- h4 NOD + GRIN: HEAD translates down 2 (the nod); his smile widens
  1px per side by copying his existing lip-corner pixels; ARM holds.
  Held.

## Verify

Envelopes re-declared per group. Idle + fx-static untouched. Green
before DONE console-hover VERIFY=PASS.
