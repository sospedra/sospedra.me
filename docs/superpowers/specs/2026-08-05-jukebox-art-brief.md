# Jukebox stall: art brief

## Subject

A Wurlitzer-1015-style bubbler jukebox for a pixel-art night market. Match the owner reference photos: magenta crown arch, amber inner arch, teal side columns, lilac and gold U-tubes, walnut body, chrome scrollwork, amber diamond grille lit from inside. A crate of spare 45s leans against the cabinet. A coin cup and sleeping cat sit on top.

## Canvas and delivery

Master canvas 1536x1024. Content rect noted on delivery. Frames pre-cropped to the rect, like the existing eight stalls. Deploy to `apps/main/public/images/bazaar/jukebox/`.

Palette anchors: magenta `#ff2e88`, amber `#ffb84d`, teal `#46e6b0`, lilac `#b98aff`, warm white `#fff3d6`, walnut `#5a3a24`.

## Frame list

- `plate-key.png`: full cabinet at rest, tubes unlit but readable.
- `fx-bubble-f1.png`: bubble positions crawling up tubes, ~300ms cadence, cycle 1.
- `fx-bubble-f2.png`: bubble positions crawling up tubes, ~300ms cadence, cycle 2.
- `fx-bubble-f3.png`: bubble positions crawling up tubes, ~300ms cadence, cycle 3.
- `char-f1.png`: light-show idle, slow warm breathe (house rhythm 1800/200/200ms), frame 1.
- `char-f2.png`: light-show idle, slow warm breathe (house rhythm 1800/200/200ms), frame 2.
- `char-f3.png`: light-show idle, slow warm breathe (house rhythm 1800/200/200ms), frame 3.
- `char-h1.png`: hover light chase, orange.
- `char-h2.png`: hover light chase, green.
- `char-h3.png`: hover light chase, purple.
- `char-h4.png`: hover light chase blue and white, hold frame.
- `cat-rest.png`: cat asleep on cabinet top.
- `cat-h1.png`: cat hover, ear twitch.
- `cat-h2.png`: cat hover, eye opens.
- `cat-h3.png`: cat hover, one eye open.
- `cat-h4.png`: cat hover, hold frame.

## Pose doctrine

Per r18, the cat is the isolated character. Generate its poses as minimal chained diffusion edits on the isolated cat, then composite. Light-show frames are whole-cabinet lighting states, not character poses.

## Rest assert

Per r17, every non-animated pixel stays byte-identical across a layer's frames.

## After delivery

Downsample and trim per sprite pipeline rules (vpx grid). Then update `SIM_DIMS.jukebox` (artW/artH from the trimmed plate, dispW/dispH proportional, height near 500 sim units like the neighbors), `STALL_SCENES.jukebox.rect`, and expand `layers` to the four-layer table from the spec. Then tune `STALL_TUNE.jukebox.lift` in the bazaar editor.
