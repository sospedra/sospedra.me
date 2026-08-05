# Papers format

Site conventions for papers. How a paper argues lives in `papers-voice.md`.

## Files

Papers live in `repo/papers/<slug>/index.mdx`. No frontmatter. No title in the body, because the title lives outside the MDX. Per-paper components sit beside the MDX, as in `repo/papers/scroll-60fps-animation/fireworks.tsx`.

## Breakouts

An unbroken paragraph column is a defect. Two breakouts per paper is the floor.

- `<Pull>line repeated verbatim from the body</Pull>` renders a teletext pull quote. The line must already appear in the body, word for word.
- `<Aside label='Key // Word'>` wrapping a `-` list renders keyed ledger rows. Tangents, citations, and lineage go here, off the main spine.
- `---` divides movements.
- Code blocks, images, and live demo components from `components/papers/<Name>`.

Components live in `services/markdown/pull` and `services/markdown/aside`, wired in `app/papers/[slug]/page.tsx`.

Mermaid is not supported. It needs a dependency that was never approved.

## Typography

- `##` headers only, sentence case.
- Bold one phrase per paragraph, maximum.
- Italics on a coined term at first use, and on quoted doctrine: *blitzscaling*, *technofeudalism*.
- `<u>` once per paper, on the sharpest line.

## Reading sheet

No background panel behind paper prose, ever. The reading band is Comeau navy, line height 1.55, white for strong text. The global prose-link rule beats module selectors, so flip the variables instead of adding selectors. See the `papers-reading-sheet` notes.

## Cards

Run `pnpm cli og` to render the OG card for a paper. `scripts/og.mts` owns the template.
