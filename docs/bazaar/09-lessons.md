# 09 — lessons (the probable thesis of the blog)

## On directing image models

1. NEVER TRUST, ALWAYS MEASURE. Dimensions, bboxes, angles, hashes.
   Two concurrent jobs once returned the same file; a ruler catches what
   an eye forgives. The model's confidence is not evidence.
2. ATTACH, DON'T DESCRIBE. The instrument hierarchy (doc 02) is the
   campaign's core discovery: corrective attachments > layout locks >
   drawn law > canvas orientation > gospels > prose. Words are the
   weakest tool in the box.
3. THE ORDER IS USUALLY THE BUG. When 30 jobs fail identically, the
   shared prompt carries the poison. Audit your own instructions with
   the same hostility you audit the output. (The stall-war audit found
   "camera slightly LOWER" and "rotated toward Ed" — the model had
   obeyed perfectly.)
4. ADVERSARIAL REVIEW OF ORDERS WORKS. Feeding the order + attachments to
   codex and a subagent as hostile reviewers found real, generation-
   ruining contradictions (keyboards both mandated and banned; a
   background color excluded by the palette law; an unsatisfiable
   diagonal ban). Cheap insurance before an expensive fleet.
5. CONVERGE BY SELF-REFERENCE. Attaching the model's own rejected output
   with its measured failure numbers is the only reliable geometry
   corrector. 62 -> 55.5 -> accepted.
6. FREEZE WHAT'S WON. The layout-lock repaint ("THE LAYOUT IS CLOSED,
   your only task is the paint") ends wars because it shrinks the
   model's degrees of freedom to the one axis still wrong.
7. THE CANVAS COMPOSES. Landscape canvases make wide stalls no matter
   the text. Orientation, size and margins are prompt instruments.
8. SEPARATE IDENTITY FROM CAMERA. "Copy the kid, zero camera" works;
   models can split a reference into channels if the order names them.
9. LESS PROSE FOR EDITS, MORE FOR SCENES. Scene generation needs
   inventory-grade verbosity; isolated-character pose edits need three
   sentences. Verbosity is a dial, not a virtue.
10. THE EYE IS THE GATE. Measurements advise; the art director rules.
    The shipped console master fails two of my mechanical checks and is
    right anyway. Numbers exist to make the conversation precise, not to
    win it.

## On the human-AI loop

11. RULE BY REFERENCE. The user never wrote a prompt. They pasted
    Pinterest frames, SVG diagrams, film stills, and crops with circles
    of anger. The supervisor's job is translating taste into contracts.
12. PROTECT HAND WORK MECHANICALLY. The hand-polish law (never overwrite
    public/images/bazaar4, skip-existing exporters, new filenames
    always) exists because one rerun clobbered three hand-polished
    files. Guardrails in code, not in memory.
13. GATE EVERY ROUND. Fleets fly detached, land into galleries, and stop
    for judgment. The user's cadence controls cost; nothing self-
    approves.
14. WRITE THE LEDGER AS YOU GO. The memory doc (bazaar3-master-pipeline)
    carried doctrine across sessions and context deaths. A war you can't
    recall is a war you refight.

## On the engineering side

15. VALIDATE LAYOUT IN BOXES BEFORE ART. The bz4-layout-proto with live
    gap rulers proved the system at 500-1900px before a single sprite
    rode it. bazaar4 did the opposite and died by audit.
16. ONE UNIT ACROSS WORLDS. Sim units (su) bridge canvas pixels, CSS
    calc math, and editor exports. Every drift bug traced to a second
    coordinate system.
17. EDIT THE REAL PAGE. The in-page editor beats any external tool
    because it manipulates the shipping DOM under the shipping CSS.
    Export intent (JSON), bake responsively, never paste absolutes.
18. RUNTIME ANIMATION IS OPACITY FLIPS. Mount every frame once; flip
    opacity. Src-swapping cost 8000 requests and decode flashes.
19. BYTE-IDENTITY AS A CONTRACT. The r17 rest-composite assertion made
    "animation broke the art" a compile error instead of a review
    argument.
20. ISOLATE CONCURRENT CONTRACTORS. Same-cwd codex jobs share temp
    files. Isolation dirs + stagger + absolute outputs; verify
    uniqueness by hash.

## Candidate blog structure

Cold open: the stall-war audit ("how did you manage to not get a single
one right?" — because I told it to be wrong). Then: the world (doc 01),
the pipeline and the wars (02, the spine), the camera as the deepest
technical thread (03), flatness (04), the layout system as the
engineering counterweight (05), the editor as the human hand (06),
light and motion as the polish chapters (07, 08), and the lessons as
the close (this doc). The images are already curated in assets/.
