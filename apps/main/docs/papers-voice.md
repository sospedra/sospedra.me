# Papers voice

Papers live in `repo/papers/<slug>/index.mdx`. No frontmatter, no title in the body. The title lives outside the MDX. The reader is an advanced engineer with no patience for filler.

## Two registers

**Tech (default).** Web platform internals, TypeScript, dev-infra, hacks. Exemplars: `mcp-is-cgi`, `use-cache-killed-isr`, `markets-leak`, `scroll-60fps-animation`.

**Politics (rare, about one per year).** Sardonic economic history in the `landlords-won` register. Historical rhymes, anti-rentier verdicts, named economists quoted straight: Hayek, Polanyi, Varoufakis.

Both registers share every rule below. Politics turns the metaphor dial up and leans harder on the breakout kit.

## The opener

Cold open on a scene, a date, or a fact. Never a definition. Never "in this post".

- History: "This story begins in 1993, at the NCSA in Illinois."
- Scene: "On the morning of August 9, 1995, a sixteen-month-old company with no profits sold itself to the public."
- Situation: "Three weeks to the US election."

The first paragraph earns the thesis. The thesis is one bolded sentence, placed early: **"MCP is CGI for agents."**

## The spine

The strongest papers run one argument shape: the historical rhyme. Old thing, new thing, same pattern, so the sins are predictable. CGI became MCP. Wall Street betting pools became Polymarket. ISR became Cache Components. Enclosure became compute.

- `##` headers in sentence case, each one a claim: "Polls herd, measurably", "The genius part", "The part that will bite someone".
- One idea per section. End each section on its load-bearing sentence.
- The closer is an epigram, two short sentences max: "Stop thinking in pages. Think in functions with expiration dates." Or: "Laissez-faire was planned. The estates were too."

## Evidence

- Every factual claim links its primary source inline: RFC, paper, changelog, court record. Link text carries the claim, never "here".
- Numbers are exact: CVE ids, dates, dollar figures, spec section numbers.
- Admit the counterargument once, plainly, and answer it: "Three honest caveats", "And one caveat for the other side".

## Texture

- Bold one load-bearing phrase per paragraph, max.
- Italics mark coined terms and quoted doctrine: *blitzscaling*, *technofeudalism*, *competition is for losers*.
- `<u>` appears once per paper, on the sharpest line.
- Wit stays dry and embedded in the argument: "a hammer shaped like a URL", "delete the page and pray", "FormMail with a language model attached". One meme per paper, two max.
- Direct second person for instructions: "Preload the assets. Mandatory."

## Breakouts

An unbroken paragraph column is a defect. Interrupt it with the MDX kit:

- `<Pull>line repeated verbatim from the body</Pull>`: teletext pull quote.
- `<Aside label='Key // Word'>` with a `-` list: keyed ledger rows.
- `---` between movements.
- Code blocks, images, live demo components from `components/papers/<Name>`.

Components live in `services/markdown/pull` and `services/markdown/aside`. Mermaid is not supported.

## Code

- Real code only, ideally from this site, and say so: "That's real code from this site."
- Trim blocks to the point. Comments only where the code cannot say it: "userId is closed over: it joins the key automatically."
- Procedures get a numbered golden-rules list, then the drawbacks, honestly priced.

## Bans

- No em dashes, hedges, or promo vocabulary. The global voice rules apply in full.
- No summary intro. No conclusion section that restates the body.
- No install-node filler. No repeated topics. No padding for length.

## Pre-publish checklist

1. Cold open with a date, scene, or fact.
2. Thesis bolded within the first three paragraphs.
3. Every claim linked or exact.
4. At least two breakouts interrupting the column.
5. Epigram closer under fifteen words.
