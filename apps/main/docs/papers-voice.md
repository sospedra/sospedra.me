# Papers voice

How a paper argues, and the sentence law it runs on. This file is self-contained. `papers-format.md` holds the MDX kit.

Every rule carries a real line. `(yours)` marks the ones your own journals already follow, untaught.

Reader: an advanced engineer who knows the domain, not the specific. He quits at the first paragraph he could have predicted. No install-node filler, no repeat topics, no padding.

## Variance beats completeness

**This is a menu, not a checklist.** No paper needs every element, and a paper that reaches for all of them reads assembled rather than written.

A 600-word note on one CSS trick needs an opener, a device, and a verdict. It does not need a steelman, a coinage, or a manor roll. A 2,000-word argument about who owns compute needs all of those and can skip the code block entirely.

Judge the set, not the piece. Twelve papers that each hit nine of nine rules are twelve papers with the same shape, which is the failure this document exists to prevent. Vary the opener, vary the spine, vary the length, vary how much furniture you bring. Some papers run bare on purpose.

Only the bans are absolute. Everything else is available.

## Spines

Pick one, run it end to end.

- **Historical rhyme.** Old thing, new thing, same pattern, so the sins are predictable. CGI became MCP. Oil lanterns became blinding LEDs. Default choice.
- **Rubric.** Invent criteria, score every option, show the row that scores clean. Local-first tables seven ideals as check, dash, cross, then prints a `???` row of seven checks.
- **Paired case.** Two cases alike in everything the system measures, different in one thing it should not. Borden and Prater, same petty theft, opposite risk scores.
- **Bug to root cause.** "It started with a mysterious soft lockup message in production" (BPF), then the descent to the dTLB miss.

`##` headers, sentence case, each one a claim. One idea per section. End on the sentence that carries it.

## Open

**The first thing on the page is always prose.** Never a video, an image, a code block, or a component. The reader arrives with no reason to care yet, and an artifact with no sentence above it is a demand rather than an invitation. Media earns its place after a line of text has told the reader what they are about to look at.

Never a definition. Never "in this post". Beyond that, **vary it**. Twelve papers that all open on a dated scene read like twelve papers from a template. The dated scene is one option out of twelve, not the house style.

Pick one, and never the same one as the last paper.

1. **Verdict.** "React Query does not need staleTime for socket data. Set it to Infinity."
2. **Number.** "The bundle carried 340 KB of dead code."
3. **Failure.** "I shipped a middleware bypass to production for nine days."
4. **Contradiction.** "Server Components do not make your app faster by default."
5. **His own question.** "Why does the first paint block for 2 seconds?"
6. **The artifact.** One line naming it, then the code block, screenshot, or graph immediately. No setup beyond that line.
7. **His exact situation.** "You migrated to App Router. Your INP got worse."
8. **Time anchor.** "In March we replaced REST with Connect. Here is the cost."
9. **Before and after.** One metric, two values, no explanation yet.
10. **The definition.** One sentence, then spend the paper on the consequences.
11. **The stakes.** "This mistake leaks your session cookie to any origin."
12. **The bug report.** The real message from the ticket or the console.

Two more carry over from short video and work in prose. Command a stop: "Stop buying gifts from a group chat." Start mid-action, hands already working, no greeting.

**Paragraph two kills the shallow cause.** "Nada de lo que ocurre es fruto de los atentados del 7 de octubre" (sionismo). "The obvious assumption is that drivers are leaving their high beams on, but the reality is more complicated" (headlights).

Thesis bolded, early, and portable off the topic: **"MCP is CGI for agents."**

## Lists

Prefer a list to a paragraph whenever the content is enumerable. Rules, steps, tradeoffs, options, costs, prices. Prose hides structure the reader then has to rebuild.

Numbered for sequence, and for anything referenced later. Bullets for a set. One idea per item, condition before command.

Prose earns its place when the ideas actually connect. Three items sitting in one paragraph doing the same job are a list that has not been formatted yet.

## Device

One artifact, introduced up top, revisited in every section. This is the whole gap between good and great.

RenderingNG returns to its two-iframe snippet five times. Turismo repeats "el país que vendió su verano" as a refrain and closes on it. Repeat verbatim. A paraphrased refrain is dead.

## Coinage

Name the thing, then think in your noun. One paper coins `pasado sintético`, `memoria estética`, `estética de la plausibilidad`, and `retrolugar`, then works in them for the rest. Italics on first use only.

## Evidence

- Primary source inline. Link text carries the claim, never "here".
- Numbers exact, and **convertible**: "Alicante recibe más turistas que todo Brasil" (turismo). "The size of more than a thousand cars" (Snow Fall).
- **Numbers in pairs.** 20 million qubits in 2019, under a million in 2025 (Quanta). One is a fact. Two are an argument.
- **Say how you know.** The command, the file, the version. "The sentencing commission did not, however, launch a study. So ProPublica did" (Machine Bias).
- **Withhold out loud.** "Under certain conditions that remain unclear at the time of writing" (Datadog).
- **Paraphrase facts, quote verdicts.** Quotes carry judgment or self-incrimination: "Es un decrecimiento fake" (turismo).
- **Hedge the attribution, never the verdict.** "The account labeled", "presumably" (Atlantic). Bounds, not adverbs: "at least 17 patients".
- Price the counterargument once, skeptic named: "Show me that you can do a million rounds" (Quanta).

## Judgment

**Concession, then verdict.** Your default, in both journals, unprompted. Grant the apparent reading, overrule it in the same sentence.

- "Es una historia bonita, claramente adulterada." (yours)
- "Pudiendo parecer una chorrada, personalmente fue un momento profundo." (yours)
- "Aparentemente brutal, en realidad es una forma de enseñar." (yours)

Rate flatly and at once: "Honestamente, bastante decepcionante" (yours). No throat-clearing before a verdict.

**Explain the mechanism, then fence it.** Your strongest habit: aurora physics at 100 to 400 km, walls of mud and straw because Japan has no hard rock. Bound it the way BPF does: "this brief detour is sufficient for this post".

## Earning the prescription

Telling the reader what to do costs something. Pay it.

- **Confess.** "my perfectionism was toxic" (Lew). Be the villain first.
- **Define before arguing.** "Nitpicking isn't about code that is wrong but suboptimal" (Lew).
- **Voice the objection in his words.** "why would I want to allow bad code to get into the codebase?" (Lew).
- **Split advice by audience, exclude yourself.** Lew tells his mother to skip passkeys, then says he uses them, because he tolerates instability she should not.
- Answer other writers by name. Castro answers Lew and the piece is better for it.

## Sentence law

The floor under every technique below. These win every conflict.

- Active voice. Name the actor.
- Short declaratives. Compound sentences coordinate with and, but, or, so. No subordinate clauses, one exception: conditionals. Non-finite phrases count as subordination. Split the sentence.
- Max 25 words per sentence. Steps in a procedure carry one action each.
- No semicolons. No comma splices. No contractions. Use articles: a, an, the.
- One name for one thing, the whole paper through.
- A verb for an action: "analyze the log", never "perform an analysis". No "-ing" main verb where a simple tense works.
- Plain copulas: is, are, has. Never "serves as", "stands as", "represents".
- The precise domain term beats the three-word approximation: "idempotent", not "safe to run twice". Everywhere else, short common words: use, start, before, after, get, show.
- No vague verbs: handle, manage, deal with. Name the operation.
- Every sentence adds new information. Delete restatements.

Bad: "The store, which owns the socket, notifies subscribers whenever a message arrives."
Good: "The store owns the socket. It notifies subscribers on each message."

## Sentence craft

- **Long, then short.** "Slicing a slab nearly 200 feet across and 3 feet deep. Gravity did the rest" (Snow Fall). One landing under six words per section.
- **Beat sentence alone in its paragraph.** "This is going to require some explaining" (Atlantic). "Toca correr." "Error." (yours)
- **The verb judges.** A program "spat out" a score. The creek bed "vomited" the debris. Adjectives stay neutral.
- **Three beats, once per paper.** "But snow does not recede. It swallows its victims. It does not spit them out." Repeated subject, varied predicate. Not the adjective triple, still banned.
- **The hinge.** "Lo verosímil mira hacia las fuentes. Lo plausible mira hacia el espectador." Asymmetric cuts deeper: three verbs for the human, one for the machine.
- **Similes measure.** The vehicle is something the reader has touched: a pachinko machine, a Roomba, a car wash with an Airbus 320 (yours). One per scene.
- **Compare to home.** "¿Te imaginas una ronda por encima del Manzanares que cruzara Plaza del Sol a 18 metros?" (yours). Native to you. Use it in English.
- **The pink mitten.** One owned, branded, or priced object per scene. `Budget draft 2 (Jane's version) final final 3.xls`. "A bicycle" is not a detail. "A blue Huffy" is.
- **Never label irony.** Prayer emoji after strike details. Adjacency does the work.
- **Question, then answer it.** "Pudimos hacerlo? No. Porque en Japón son así" (yours).
- **A running motif beats a one-off joke.** Manhole covers recur through your Japan journal and land every time. Dry wit rides inside a sentence already doing work: "ranking just after Steven Spielberg and right before God" (Weinstein).
- **Memes and jokes stay.** Two or three touches per paper, placed where the argument is already won. "GaaS, Gaas, Gaas!" lands because the coinage earned it first. The reference corpus has almost none of this and you like it anyway. That is a preference, not a defect. The limit exists so they keep working, not to sand them off.
- **Politics and philosophy take fewer memes, not less humor.** Drop the image macros and the pop-culture callouts. Keep irony, and keep it unlabelled: Trump demanding prison for a private email server, stated flat beside the Signal thread. "Es una historia bonita, claramente adulterada" (yours) is a joke and a verdict in six words. The register is dry, not humorless.
- **Second person for instructions.** "Preload the assets. Mandatory."
- Bold one phrase per paragraph. `<u>` once per paper.

## Close

A verdict under fifteen words. Not a question.

"Para España, los turistas son una necesidad. Y no hay alternativa" (turismo). The Atlantic ends on a receipt that detonates backward: "We are currently clean on OPSEC."

Closing on a rhetorical question is how a strong piece ends weak. Two reference pieces do it and both drop a tier.

**Close the thread you opened.** Japan raises the emergency-exit seats on day one and settles them on day fifteen: "Nunca jamás voy a coger la salida de emergencia." Callbacks beat summaries.

Known tension: when you revise, you add a summary closer. Tromsø ends on one. Fine in a journal, wrong in a paper. Callback, verdict, or epigram.

## Bans

- Punctuation: no em dashes, in any circumstance. No semicolons. No contractions. No curly quotes. No title case in headings.
- Vocabulary: crucial, pivotal, robust, seamless, leverage, utilize, delve, showcase, landscape, tapestry, testament, foster, enhance, comprehensive, additionally, moreover, furthermore, rung, load-bearing.
- Hedges and filler: basically, essentially, very, really, actually, "in order to", "it's important to note".
- Negative parallelisms ("not just X, it's Y") and tailing negations ("no guessing").
- "-ing" tails that fake depth ("...ensuring reliability, fostering trust").
- Fake hooks and signposting: "Here's the thing", "The kicker?", "Let's dive in".
- Aphorisms as decoration. A thesis analogy the paper then spends itself proving is a claim, not an aphorism.
- Decorative bold and decorative emoji. The one bold phrase per paragraph and the meme budget are the whole allowance.
- No summary intro. No conclusion restating the body.
- No joke doing the job a sentence should. Humor decorates a won argument, it never carries one.
- No opener repeated from the previous paper.
- Drafts run blunt and profane. Neither ships.

Politics and philosophy are not a separate register. Same voice, drier sourcing, no snark, fewer memes, irony intact. The best political writing here damns by accumulation and never comments on its own evidence.

## Code

Real code, ideally from this site, and say so. Trim to the point. Comments only where the code cannot speak. Procedures get a numbered list, then the drawbacks, honestly priced.

## Checklist

Four hold for every paper.

1. First thing on the page is prose. No media, no code, no component.
2. Opener archetype chosen on purpose, and different from the last paper.
3. Claims linked or exact.
4. Closer is a verdict, not a question or a summary.
5. Sentence pass: nothing over 25 words, no passive with a known actor, nothing from the ban lists, one name per thing.

The rest are available, and a short paper is allowed to skip most of them: paragraph-two kill, bolded portable thesis, one device across sections, coinage, convertible numbers, steelman, breakouts, running motif.

Last check is on the shelf, not the page. Put the new paper next to the last three. If the shape rhymes, change something before publishing.
