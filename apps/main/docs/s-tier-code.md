# S-tier code

This document is a doctrine for production-grade code. The rules come from large production systems. The domain specifics are gone. Each rule carries its reason. Adopt the document whole, or lift sections into your agent docs and lint config. The examples are TypeScript. The rendering, data, live-data, security, and component sections assume a server-rendered web app with streaming, a query cache, and client stores. The other sections are stack-free.

## 1. First principles

### The decision chain

Architecture has a hierarchy. A paradigm sets the worldview. Principles make decisions inside it. Patterns implement those decisions in code. An implementation must trace up this chain, or it is ad hoc.

Name the paradigm once, in one sentence. Example: functional and reactive. Components are pure functions of state. Side effects live at boundaries. State is immutable. Composition beats inheritance.

### Identity and objective function

Write one sentence for what the system is. Example: server-first, performance-critical, not a single-page app. Then write the objective function: the short list of quantities every change must reduce. Example for a web client: client JavaScript, data sent to the client, re-renders, overfetching. Every engineer, reviewer, and agent optimizes the same list.

### Tie-breakers

Two approaches both look valid? These principles break the tie.

1. Single responsibility. One component, one concern. One hook, one behavior. One module, one owner.
2. Composability. New behavior arrives as new composition, never as new internal branches.
3. Substitution. One function returns one shape for every variant, so consumers never branch on the variant. A variant with real behavior differences rides a discriminated union, matched in one place (section 7).
4. Narrow surfaces. Each module exposes a small public API. Restricted-import lint enforces the boundary, not a barrel file.
5. One owner per datum. Copies can exist, but each piece of data has one canonical write path.
6. Partition by access pattern. Group code by product usage, not by technical category. A terms page and a checkout page share a navbar and nothing else.
7. Boundary validation. Validate at each trust change. Internal type safety alone creates false confidence.
8. Mechanical enforcement. A convention without a lint rule or test will drift.

### One pattern per problem

Pick one sanctioned pattern for each recurring problem and document it. Reviewers reject alternatives. In the agent doc, state every rule in four parts: the rule, the reason, the enforcement, the sanctioned exemptions. An escape hatch always carries a TODO and a tracking issue.

### Measure, then decide

Budgets, timeouts, and retry policies derive from infrastructure numbers and production measurements. Label every number as a target or as a measurement. Re-measure after each serving-chain change. A deliberate unbounded cost records its revisit trigger, and the trigger is a number.

## 2. Classify data first

Every piece of server-sourced data belongs to one of three classes. Classify before you pick storage, transport, or rendering. The home follows from the class. Client interaction state stays outside these classes (section 5).

| Class | Nature | Examples | Home | Shared cache |
| --- | --- | --- | --- | --- |
| 1. Shell | Static-ish, public, shared | titles, metadata, stale display numbers | prerendered markup behind an explicit cache boundary | yes |
| 2. Volatile | Changes by the second | live prices, scores, presence | client live layer, stream-owned | never |
| 3. Private | Bound to one user or session | account data, balances, auth state | private request frames or client fetches | never |

The sharpest test: can the user act on the value? Payments, orders, submissions. If yes, never serve it from a shared cache. A display copy of the same number can be a stale cached seed. Same word, different class.

Ownership follows the class, never the transport. Each class keeps one canonical write path. The cache boundary regenerates class 1. The stream is the only writer for class 2. Class 3 allows optimistic writes, and one authority reconciles them.

## 3. Render in three layers

Every page is three layers. Each layer has one owner and one transport.

1. Static shell. Prerendered markup from the CDN. Near-zero JavaScript. It carries chrome, layout, metadata, and stale seeds. Target: around 100ms to first paint.
2. Request-time holes. Some regions need per-request data. They stream into the same response behind explicit boundaries. No second round trip.
3. Live layer. Client-only. Streams and subscriptions take over after hydration.

The rules:

- Regions get strategies. Routes do not. Decide per region: cacheable, request-time, or live.
- Never push the live layer through the server. A server render of a live value is stale on arrival. Ship it in the shell as a display seed, and let the stream own the live value from there.
- Cacheability decides the wrap. Cacheable data bakes into the shell. Request-time data sits behind a streaming boundary. A boundary around cacheable data trades the fast paint for a skeleton flash.
- No route-level loading state. The prerendered shell is the transition state. Put an inline skeleton next to each hole and shape it like the real content.
- First paint is never blank. Seed every island from the shell. Verify with curl: the seeds must appear in the HTML.
- The first streamed byte commits the status code. Decide real 404 and redirect outcomes before the stream starts.
- A hole holds the response open, so hole fetches fail fast: zero retries and a timeout near ten seconds. Retry ladders belong to background work.
- Expected absences are values, not exceptions. A missing entity returns a status value, so the cache stores the miss verdict too. Prove the miss through the upstream contract. A bare 404 from the edge proves nothing. Transient failures still throw, and rejections are never cached.
- Cache directives keep one home, the snapshot layer (section 4). Not in pages, not in layouts, not in fetchers.
- Cache honesty. A plain in-memory cache is per instance, so warm means warm on that instance. Tag entries before any invalidation endpoint exists. Push invalidation becomes one endpoint later.
- Keep shared layouts cheap. A slow await in a shared layout taxes every page below it.
- Defer below-the-fold and non-critical work. It never blocks the shell.

Failure verdicts on a detail page: a proven miss gets the not-found flow. A real entity with empty content gets a designed found-state. Everything else gets an error boundary with retry. A list may render empty. A detail page may not.

## 4. The data pipeline

Split server data access into four layers. Each layer has one job, so refactors stay small and safe.

```
data/event/
  event.server-fetcher.ts    # API integration, narrow API-shaped output
  event.mapper.ts            # validation, normalization, view models
  event.mapper.test.ts       # the workhorse test suite
  event.server-snapshot.ts   # the cache boundary
  event.types.ts             # contracts, zero runtime imports
```

- The fetcher owns API integration and nothing else. It returns narrow API-shaped data for one use case. It is a replaceable boundary. A better endpoint ships? Only the fetcher changes. The mapper and UI stay put.
- Treat every external field as nullable, missing, or malformed. API-shaped types admit null and missing. View-model types are clean and use undefined for optionals.
- The mapper owns correctness: validation, coercion, normalization, calculations, and logging. It returns view models, never raw records. It logs normalization issues with context, so the team sees upstream drift early.
- Mappers are deterministic, and the log context arrives injected. They test without network, framework, or UI.
- The snapshot is the only home for cache directives. It composes fetcher plus mapper, so the cache stores the serialized view model.
- Read request-scoped values (cookies, headers, params) above the cache boundary and pass them in as arguments.
- Authenticated per-request reads get a separate loader file, intentionally uncached.
- Client code imports the types file, never the runtime data module.
- Collapse the layers into one thin loader file when the upstream already returns the view shape. The layered module earns its place with a real mapper.

Change guide by symptom: the endpoint changed, start in the fetcher. Values render wrong, fix the mapper and extend its tests. Cache lifetime or invalidation, edit the snapshot. A new UI field walks five steps: fetcher contract, mapper normalization, view-model type, UI consumption, mapper tests.

The fetch rules:

- Components never call the HTTP client. Data access lives in the data layer and its adapters.
- Fetch the minimum. Only what the route renders, and only above-the-fold data first. "Fetch everything and cache" is the named anti-pattern.
- Project at the boundary. Never pull a 90-field record to render three fields. Push projection upstream if the backend can own it. An app-side projection mapper is a bridge, never a home.
- Batch loops. One request per list item is a bug at page scale.
- Parallelize independent fetches. A hand-built waterfall is a bug.
- Make one cross-network call from the rendering host. Let the aggregation layer fan out near the services.
- Push contract fixes upstream: sparse fieldsets, batch endpoints, machine-readable specs, one error shape.

## 5. State has one owner

| State | Owner |
| --- | --- |
| Server data | server render, or the query cache |
| Volatile live values | the live store (the stream is the only writer) |
| UI state (modals, tabs, theme) | one client store per domain |
| URL state (filters, search) | one param module per route |
| Component-local | component state |

A fact lives in exactly one owner, and everything else derives by subscription. An effect that copies store A into store B is a sync bug with latency. Mixed ownership is the root failure: a UI store with fetched data, component state with an actionable API value, a query key with every live tick. Each one creates silent drift or render storms.

The query layer:

- Server-rendered data is the default. The query cache is the exception. Use it only if the client must refresh the data after first render: interaction, session, or auth.
- One query client from one accessor. No feature constructs its own.
- Three policies live in the client and never in features. Auth-expiry teardown runs exactly once in the cache hooks. Error reporting runs once through the logger. Invalidation is declarative: a mutation declares its targets in metadata, and the client executes them.

```ts
useMutation({
  mutationFn: submitOrder,
  meta: { invalidates: [keys.items(), keys.balance()] },
})
```

- Identity sweep. A query bound to the signed-in principal declares a sweep tag. Login, logout, and session expiry purge those entries. Without the sweep, cached data leaks across identities.
- Declare each query once as an options factory. Call sites reuse the factory and never inline keys. A pass-through hook around a factory is an anti-pattern.
- One key factory per domain, composed into one central key object. Identity-defining params go into the key. The domain root key is the invalidation handle.
- Stale times come as named classes from one file. Stream-owned keys never background-refetch: infinite staleness plus invalidation, so a refetch never overwrites stream writes.
- Read slices with a selector. An unchanged slice skips the re-render.
- Prefetch only on high intent: hover, or the next page during pagination. Speculative prefetch fights fetch-the-minimum.
- Do not ship the page as serialized cache state. Pass finished markup to the client by default. Send value seeds only if the client must merge, sort, paginate, or stream over the values.

Client stores:

- One store per domain, colocated with the domain. Never a generic stores bucket.
- Expose a selector-required hook. Whole-store subscriptions cause render storms.
- Stores are module singletons. One server process shares them across every request, so only browser code writes to them.
- All persisted preferences live in one persisted store. A new preference is a new field, never a new storage key.
- Selection state holds identity only. Resolve the entity from its live source at read time. A copied object goes stale at selection time.

## 6. Live data

- One connection per tab. Multiplex typed channels over it. A socket per feature wastes connections and multiplies failure modes.
- Consumers read through one hook and never touch the connection. The connection lives at module scope, deduped and refcounted, and it survives navigation.
- The last unsubscribe arms a short close grace, so a route change never drops and redials.
- Run hot pipelines off the main thread: dial, decode, validate, and coalesce in a worker. Keep the newest value per resource and flush once per animation frame with a timeout backstop. The main thread receives one batched store write per frame, independent of message rate.
- Validate every frame before it reaches a store. The decoder states a fact: update, ignore, remove, or resync. The engine decides the consequence. An invalid payload is never written.
- Reactive layers detect change by reference. Produce new objects for what changed and keep references for the rest, or the UI stops updating, or updates far too much.
- Sequence numbers promise what the contract says. In this model they dedupe only, and the server signals loss with an explicit resync control. On resync, invalidate and reseed. Never infer a gap without a contiguity guarantee.
- Reconnect means refetch. Pull the full snapshot, then resume live updates. Never resume deltas after a gap.
- Seed, then take over. First paint shows the shell seed. The first live frame wins from there. A stale seed beats a loader, so update it in place and never cover it with a skeleton.
- Guard against stale frames. Drop updates older than the current value. Never move a terminal state back to live without an explicit upstream contract.
- Retention is a per-channel correctness decision. Keep the last value only if frames are full per-resource snapshots. In a change-data-capture feed a stale entry is a correctness hazard, so evict by default.
- Derive the connection policy from infrastructure numbers, never from taste: heartbeat cadence, a watchdog under the proxy idle timeout, backoff with full jitter, a fixed wait on per-IP caps.
- Build the engine as a functional core under an imperative shell. Pure policy modules return commands. One interpreter applies them to timers, sockets, and stores. The policy then tests as plain functions.
- Fix the vocabulary: one word per layer (stream, channel, resource, decoder, live query). Two names for one thing breed bugs.
- Cross-tab sharing has sharp edges. Elect a leader through platform locks. Stamp leader messages with epochs. Treat the message parser as a trust boundary: an older deployed version of the app speaks on the same channel. Ship the mode behind a flag. A missing platform capability falls back to single-tab behavior, byte for byte. Gate the flip on telemetry plus a scripted failure drill.

## 7. Model the domain in types

Brands:

- Brand the units. The compiler must not confuse an amount with a quantity or a rate. `fee(price, quantity, coefficient)` compiles with raw numbers in any order. With brands, the wrong order does not compile.
- Only constructors and schemas mint brands. A cast to a branded type outside the module breaks the contract.
- Constructors canonicalize or return null. Wire drift is never cleaned silently. Cleanup for masked user input lives in named form-only adapters.
- Refinements put invariants into the type: signs, closed ranges, positive steps. Operations preserve the invariant or revalidate it. No operation quietly upgrades an out-of-range value into a valid one.
- Cross-unit arithmetic goes through named conversions. Callers never subtract one unit from another by hand, and they never invent a magic exchange rate.
- Bound division precision. Require an explicit rounding policy on averages. Return null instead of contradictory outputs.
- The value module owns math and never owns product policy. No universal zero, no default minimums, no tolerances. Policy stays with the callers.
- Mint numeric config once at the boundary and pass it branded. A calculation never accepts a raw number.
- Delegate regulated math to the one established engine. Pin its behavior with focused tests, never with a second implementation.

State machines:

- A process with phases (fetching, forms, wizards, connections, orders) is a discriminated union, never parallel booleans. Three boolean-and-nullable fields encode eight shapes with four legal. The union makes illegal states unrepresentable, and consumers stop null-checking paths the type forbids.

```ts
type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error }
```

- One pure function owns every transition: `(state, event) => state`. An event invalid in the current state returns the state unchanged, decided in this one place. The transition body is a ts-pattern `match(event)` chain, and `.exhaustive()` turns a missing case into a compile error.
- Derive flags from the machine at the point of use. A stored `isLoading` next to `status` is a sync bug on a timer.
- Server-side statuses get one table of legal moves and one guard. Never scatter status checks across handlers.
- Plain union plus reducer first. Reach for a state-machine library only for hierarchy, parallel regions, or delayed transitions.

Results:

- Expected failures are values. An operation with normal failure modes (validation, not found, declined payment) returns a result union, so the failure path shows in every signature. Throwing is for bugs and truly exceptional conditions. A thrown error is a goto. A returned error is data.

## 8. Trust and security

Section 4 decides what enters the system. This section decides who may call at all.

State the threat model in one paragraph in the agent doc. Example: pages are public and ungated, and the backend scopes every authenticated read and write by its token. Two duties then stay with the app. Caller authenticity: a cookie-authed handler answers any browser an attacker can steer. Credential blast radius: a bearer lives in browser JavaScript by design.

### Validation

Trust changes in three places. Validate at each one.

1. Inbound API responses. Parse against a schema before anything enters app state.
2. Stream frames. Validate in the decoder. On mismatch, log and refetch the snapshot.
3. Client-to-server input. Every action argument, request body, and search param is untrusted. Validate on the server before business logic runs.

One fetch boundary:

- Route all JSON reads and writes through one small fetch wrapper. It owns status checks, JSON extraction, schema parsing, typed errors with response context, and auth retry.
- Never `res.json() as T`. A cast validates nothing. Generated types are compile-time documentation only.
- An intentionally unvalidated response passes an explicit unknown-schema. Omission is not a policy.
- Auth retry lives in the wrapper. On auth expiry, refresh once and retry once. A second failure signs the user out. Features never hand-roll this.

### Caller authenticity

- The browser attaches the session cookie to a cross-site POST on its own, so a session check proves nothing about the caller. One guard module owns the same-origin check, and every cookie-authed route calls it.
- Writes fail closed. Allow a request only with non-cross-site fetch metadata, plus a matching origin header or a safely absent one on a same-origin fetch. Reject sibling subdomains. Reject header-less browsers. Everything else gets a 403 and a security log line.
- Cookie-authed GET routes are a cross-site-leak surface. Same-origin GETs omit the origin header, so fetch metadata is the only caller signal. Reject cross-site and same-site. Allow same-origin, direct navigation, and header-less non-browser clients.
- The asymmetry is deliberate. A header-less client may read and may never write.
- A native app shell may omit the origin header. Admit it only on three conditions at once: a custom first-party header, non-cross-site fetch metadata, and a matching or absent origin. The custom header carries the weight: a cross-site page cannot send one without a CORS preflight the app never answers.
- Pin both guards with forged requests against real money routes in tests.

### Sessions and bearers

- The session credential never reaches client code. Keep it in an httpOnly cookie. Server code reads it through one fenced accessor. It is never a prop, never a cached return value, never a response body.
- If the browser must call a backend directly, mint a short-lived derived token from one dedicated route, and let exactly one module consume it. That bearer is XSS-reachable, so its lifetime is the blast radius.
- Cap the bearer lifetime with one hard ceiling. The mint route and the client cache import the same constant, so they cannot drift. The ceiling exists on evidence: upstream systems mint hour-long tokens by mistake.
- Mint status codes are a contract. A dead session signs the user out. A re-grant code asks the shell for fresh credentials. A transient upstream failure never tears down a valid session. If upstream signals are ambiguous, branch on locally decoded claims, never on attempt-and-fallback.
- Cookie custody stays on the app host. A browser cannot attach an httpOnly cookie to a third-party call, so the mint, refresh, and clear routes never migrate off it. Keep that route list in the agent doc.
- A cookie may select a backend host only against a fixed host map, and only custody routes honor it. A free host value in a cookie is an open redirect for credentials.

### Content security policy

- Ship two policies: enforced and report-only.
- Enforce the exfil boundary first. The connect-src list stops a stolen bearer from leaving the page. Enforce object-src none, base-uri none, form-action self, and frame-ancestors none: each kills a whole vector at no compatibility cost.
- Keep script-src report-only until the evidence allows more. Streaming server rendering emits per-request inline scripts, and no build-time hash covers them. A per-request nonce forces dynamic rendering and defeats the caching model. Tighten only after the violation-report stream stays quiet across every vendor flow. Treat that stream as a standing task.
- Trusted types ride report-only with one default policy. One vendor host list feeds both the header and the policy, so the two cannot drift.
- Subresource integrity fails behind a body-rewriting proxy: the hashes stop matching your own chunks, and the browser refuses them all. Verify on a real deployment first.
- Set the boring headers once: deny framing, no MIME sniffing, strict referrer policy, and a permissions policy with deny by default plus documented exceptions. Force no-store on session-bound API responses. Public data rides the cached rendering path, never those routes.

### Write safety

Retry semantics correct for a read double-apply a write.

- Zero transport retries on mutations. The shared caller may retry reads with backoff, never writes. The auth-refresh replay is the one sanctioned re-send.
- Never pass a component abort signal to a write. A write must outlive unmount.
- Idempotency keys ride a request header. The domain lifecycle picks and recycles the key, so the auth-refresh replay reuses it.
- Classify failures by structured error code plus a dispatch stamp, never by HTTP status. No dispatch stamp means the request never left the app. Never read it as "maybe it landed".
- Route handlers keep a fixed order: parse and validate input, authenticate, check coarse permission, perform the effect, respond. The happy path appears once, at the end.
- Treat every mutation endpoint as public. Direct requests can reach it, so require a session, validate the body, and let the backend authorize by token.
- Resource ownership lives upstream. The handler gates the session and the role. The backend scopes every read and write by token, and a response without that scoping is a backend contract bug, not app code.

### Leaks

- Class 3 data never touches a shared cache (section 2). The failure is one user's balance served to another.
- Identity-bound queries declare the sweep tag (section 5), or cached data survives sign-out.
- Never log credentials, tokens, signed payloads, or private keys, and never send them to analytics. Automatic redaction is a net, never a license.

### Dependencies

- Security is the top priority for any dependency change. Pin exact versions.
- Verify each version against the registry, the upstream repo, release notes, and advisories before you add it. Record the reason and the verification in the PR description.
- No verification available? Do not add the dependency.

### Known gaps

Write down what the model does not cover. An unwritten gap becomes an assumed protection. Examples: a missing value-level taint API leaves the import fence as the only guard on the session token. A report-only script-src is a task, not a control. Shared infrastructure settings live outside the repo, so CI cannot see their drift: probe them on a schedule.

## 9. Errors, logging, configuration

Errors:

- One typed error family. One file per error, no barrel.
- Errors are data. Never log or report inside a constructor. Branch on fields, never on message strings.
- Handlers throw typed errors. One boundary converts them to responses through a single helper. No raw `new Error` in app code.
- Report once, where you own the error. A handled catch logs. A re-throw does not also log, or the boundaries above double-count it.
- One root error boundary suffices. Child boundaries exist only for distinct copy. The root boundary replaces the shell, so it must recreate styles, fonts, and bootstraps.

Logging:

- One logger with named scopes. No console calls in app code. The single documented exception is the logging bootstrap: it cannot report its own boot failure through itself.
- Structure the messages: static text plus props. Lint bans string interpolation inside messages. Pass the raw error as a prop and reference it in the message.
- An alertable event gets a stable dot-joined token in the log line. Monitoring matches whole tokens.
- Alerting categories are exempt from sampling. Sampling corrupts monitor ratios.

Configuration:

- All environment reads live in two modules: one universal, one server-only. The server module fails the client build on import.
- Access values by full name through one object. A re-aliased constant hides provenance.
- Derive over configure. Hosts derive from one environment switch. Per-URL variables split-brain client and server routing.
- Required configuration fails the boot. Optional configuration degrades, and the doc states the fallback consequence. Platform detection reads absence as local.
- Sanctioned raw reads live in one lint override, each with a written reason.

## 10. Organization and naming

Organize by domain pods:

- A pod is one domain's home. Its data access, mappers, stores, components, and tests colocate there. The pod owns the domain the way a bounded context does.
- The file tree mirrors the delivery structure: routes and entry points, never a parallel features tree. Find the route, open the folder.
- Code graduates to a shared home on real reuse, never speculatively. One consumer means it stays in the pod.
- Code names match the product vocabulary. Never invent synonyms for things the product already names.

One unified writing style:

- Files: `<domain>.<suffix>.ts`. Symbols: `<domain><Verb>()` or `use<Domain><Thing>()`. One glance gives the domain and the role.
- A suffix is a contract, not a style. Each suffix names one responsibility and its import rules, published in the agent doc. Examples: `.mapper.ts` owns validation to view models. `.server-snapshot.ts` is the only cache home. `.store.ts` is the domain's one client store. `.types.ts` carries contracts with zero runtime imports.
- `server` in a filename means server-only. `client` means browser-safe. Build-time fences enforce it, and the name makes it readable.
- One data home per route. One store per domain. One options file per domain.

Boundaries:

- No first-party barrels. Barrels defeat tree-shaking, inflate bundles, and blur ownership. Restricted-import lint rules define the public surfaces.
- A `legacy/` folder shrinks and never grows. New code never imports from it.
- App-boot wiring keeps one shape: one runtime hook per domain, no parameters, no return value. One app-level component mounts all runtimes unconditionally, and each runtime gates itself internally.
- Keep a vocabulary table per subsystem: one word per concept. Defend the words in review.

## 11. Write simple code

Optimize for cognitive complexity: reader effort, never path count.

The cost model. Each branch, loop, or catch costs one. Each nesting level adds one more, and callbacks count as nesting. A match expression or switch costs one in total. Early returns, optional chaining, and nullish coalescing are free. Consequences: flat is cheap, nested is expensive, a lookup beats a match, a match beats an else-if chain, early returns beat else.

Budgets per function: cognitive complexity 10 hard and 5 target, nesting depth 3 hard and 2 target, parameters 3 hard and 2 target, length soft at about 60 lines. The numbers are tunable defaults, not measurements. Length is a symptom. Complexity is the rule. Over budget: extract, restructure, or flag it. Never obfuscate to pass.

Control flow:

- Guard clauses first. Validate and bail at the top. The happy path sits last, at the lowest indentation.
- No else after return or throw. The code after an exit is already the other branch.
- A ternary selects between two expressions. Never nest ternaries. Never put side effects in the arms.
- Three or more branches on one value: a lookup table for pure data, or a ts-pattern `match().exhaustive()` for logic. Never an else-if chain, and never a bare switch.
- Merge collapsible ifs. Name any condition with three or more operands as a `const` or a predicate.
- Positive conditions first. `if (!x) A else B` forces the reader to invert twice.
- One try per operation, at the boundary: handler, action, job entry. Extract the fallible call, so the try body stays minimal. A value-shaped attempt helper covers parse-or-fallback.
- No labeled breaks. Recursion only for recursive data.

Data flow:

- `const` by default. A `let` survives only as the clearest option, with a tiny scope.
- Never assign in branches. That variable is a ternary, a lookup, or a function.

```ts
const DISCOUNTS = { pro: 0.2, plus: 0.1, free: 0 } satisfies Record<Tier, number>
const discount = DISCOUNTS[user.tier]
```

- One variable, one meaning. New meaning, new name. Never reassign parameters: copy explicitly.
- Declare at first use. A variable alive across 30 lines marks a function to extract.
- Do not mutate data you did not just create. Use the non-mutating array methods and spreads. Local mutation of a value made in the same function is fine on measured hot paths only.
- No status flags flipped in loops. Use `some`, `every`, `find`.

Iteration:

- Collections get combinators. A loop with a push into an outer array wanted to be `map` or `flatMap`. `reduce` only for scalar folds, and never build objects with spread inside it: quadratic.
- No `forEach`. Values come from combinators. Side effects use `for...of`: it is honest, and it supports `await` and `break`.
- `while` only for unbounded work, always with an explicit bound: max attempts, max pages, or a deadline.
- Check installed dependencies before writing a nontrivial helper. The installed version covers the edge cases yours will miss.
- A measured hot path may use a plain loop with local mutation. Name the constraint in one line. Unmeasured performance is not a justification.

Strings:

- Regex is a last resort. Prefer string methods and real parsers: URL, JSON, number, date. A surviving regex gets a domain name at module scope, stays linear (no nested quantifiers), and receives bounded input.

Function shape:

- One level of abstraction per function. Orchestrate named steps, or do the work. Never both.
- Beyond three parameters, take one options object and destructure it in the signature.
- No boolean behavior switches. `doThing(data, true)` is unreadable, and the flag doubles the paths. Split into two named functions over a shared helper.
- An extraction must earn a domain name and stand alone. A `handlePart2` name marks a wrong boundary: re-split by responsibility.
- Pure core, imperative shell. Decisions live in pure functions from data to data. I/O stays in thin outer layers. Pass collaborators (clock, id generator, fetcher) into the logic, so the core stays testable.

Composition:

- No inheritance for behavior. Classes exist for platform contracts only. A strategy is a function argument, never a subclass and never a mode string. Closed set of behaviors: a lookup of functions. Open set: accept the function.
- Cross-cutting concerns wrap functions: `withRetry(withCache(fetchUser))`. Each wrapper does one thing and composes in any order.
- No god options bags. Keys valid only in combination become a discriminated union, or the function splits per mode.
- Compose in named stages and name the intermediates with meaning. Point-free golf is compression, never composition.

Async:

- Independent work runs concurrently. Fan-out with tolerated partial failure uses the settled variant. Timeouts and races use signals. Sequential awaits exist only for real data dependencies.
- Long-lived async work accepts a cancellation signal and honors it.
- Subscription and cleanup live in the same expression or the same effect. A listener without a visible removal is a leak in review, even when it happens to be fine.

Comments:

- Zero comments is the default. Before writing one, attempt the rewrite that deletes it: rename, extract, restructure.
- Three cases earn one line: outside context ("gateway rejects batches over 100"), a non-obvious algorithm (a reference), a hack (justification plus exit condition).
- Banned: what-comments, narration and section headers, change markers, reviewer notes, restated types. Never comment around your own change, and delete any comment your change makes stale.

Anti-gaming:

- The metrics proxy reader effort. Passing the number while making the code worse is failure. No part1/part2 splits. No closure tables over shared mutable state. No dense one-liners. No five-combinator chain where a plain loop reads better. No new paradigm libraries in a codebase without them.
- A budget blocks a meaningful refactor? Keep the clearest version and say so, with the measured score. Never add a silent suppression.

The playbook, symptom to move:

| Symptom | Move |
| --- | --- |
| Depth over 2 | invert and return early, or extract the block |
| Else-if chain on one value | lookup table, or `match().exhaustive()` |
| `let` assigned in branches | ternary, lookup, or extracted function |
| Flag flipped inside a loop | `some`, `every`, `find` |
| Loop building an array | `map`, `filter`, `flatMap` |
| `forEach` | combinator for values, `for...of` for effects |
| `while` without a bound | max attempts, max pages, or a deadline |
| Hand-rolled groupBy, dedup, debounce | the installed utility library |
| Condition with four or more operands | named `const` or predicate |
| Regex where a parser works | string methods, URL, JSON |
| Boolean parameter | two named functions |
| `try` around a whole body | extract the fallible call, wrap only that |
| Nested ternary in markup | early returns, a variable, or a subcomponent |
| State mirrored via an effect | compute during render |
| Several state values updated together | one reducer |
| Vague extraction name | wrong boundary, re-split by responsibility |
| Comment restating the code | delete it, fix the name it papers over |
| Parallel booleans encoding phases | discriminated union |
| Status checks scattered per handler | transition map plus one guard |
| Base class with overrides | function parameter or wrapper |
| Options with interdependent keys | union input or split functions |
| Effect copying one store into another | subscribe and derive |
| Throwing for expected failures | result union |
| Sequential awaits, no data dependency | concurrent combinator |

## 12. Components and design systems

Tokens:

- Generate tokens from the design source. Code matches the export and never overrides it. A wrong-reading color is a design bug: fix the variable upstream, re-export, regenerate. A divergent code fix gets reverted even if it looks better on screen.
- Two tiers: primitive palette and semantic aliases. Semantic first. Raw hex values and framework default palettes are lint-banned.
- The root switches the theme through one attribute. Call sites write nothing per mode.
- The generator owns all normalization, upstream typos included. Contract tests pin freshness: the committed output must match a rebuild in CI.
- One composite text style per element, mapped one-to-one to named design styles. Never stack a second style on top.

Component design:

- One default component per job. Anything clickable uses the kit button, or it silently drops focus rings and state treatments. Truncation keeps the full text in the DOM for screen readers and find-in-page. Images fade in over a skeleton. A hand-rolled copy of a kit pattern is an anti-pattern.
- The target: a new page is 80% kit assembly and 20% domain UI. Someone rebuilt an existing pattern from scratch? The kit failed.
- Compound components beat prop sprawl. Export namespaced parts. Parts share state through a context accessor, and the accessor's label powers the used-outside-provider error.
- A component with sprouting boolean props (`isCompact`, `asLink`, `noBorder`) is configuration, not composition. Prefer separate components over shared internals, children and slot props for structure, and union props when a variant changes the required fields. Hooks compose the same way: build the big hook out of small ones, never one mega-hook with option flags.
- Route colors through variable slots. Variants set slots. States read slots. One mechanism serves variants and per-instance overrides. Consumers pass base colors only, and the component derives hover, disabled, and foreground.
- Props extend the element type. Never hand-list native props. Export by name. Hoist timings, easings, and limits into named constants.
- Shared primitives are owned. The public API cannot express your need? Stop and ask the owner. Composition on top is always fine.
- Classify presentation once in the mapper and carry it as a discriminated union. Renderers match exhaustively. Never classify by URL or label heuristics at render time.
- State accessibility as a consumer contract in the doc. Example: icon-only controls require an accessible label.
- Each component gets a README next to its source. A central table carries only the import path and one line per component. Docs update in the same PR as the change.
- Ship a playground per component. One registry file is the source of truth. Navigation, search, and drift badges derive from it.

Component control flow:

- Guards return early: loading, error, empty, and unauthorized states exit before the main markup. One unconditional return at the bottom.
- Two render branches: one ternary. More: early returns, a variable, or a subcomponent. Render by discriminant with a lookup keyed by status.
- Guard `&&` rendering with real booleans. `items.length && <List />` renders a zero.
- Four or more state values updated together: one reducer, so every transition lives in one function. One custom hook per concern.
- Derived state is computed during render, never stored. A state-plus-effect mirror of another value is reassignment across renders, with extra renders as interest.
- Server components parallelize independent fetches. Framework redirects throw, so no else after them.
- Under a compiler, do not hand-write memoization. Keep manual memoization for identity correctness only. Redundant memoization is noise the compiler must reason around.

Hydration:

- Server markup and the first client render must be identical. State initializers run during server rendering too. So nothing per-user or per-browser may shape the first render: no storage, no window, no clocks, no locale formats, no randomness.
- Four sanctioned patterns cover the gap. A post-hydration swap behind a hydrated flag. An external-store subscription with a server snapshot. A pre-paint head script: it stamps a root attribute and CSS reveals the result. Deferred rehydration for persisted stores. Do not invent a fifth.
- Verify under hostile settings: a non-UTC timezone, reduced motion, dark scheme, seeded storage. A mismatch for returning users only is still a bug.

Animation:

- CSS first. Reach for a motion library only for spring physics, FLIP, or gestures. Honor reduced motion everywhere.
- A standing animation may touch compositor-owned properties only: transform and opacity. Loops never run from JavaScript. SVG animations do not composite in practice, so move a standing pulse to an HTML overlay.
- One owner per animated dimension. Never spring a container against content in motion. The spring pins the box against a moving target, then snaps.
- A transition needs a painted starting frame, and one animation frame fires before paint. Gate insertion animations with an after-paint helper.

## 13. Accessibility

Accessibility is architecture. The failures that matter are systemic: a cascade rule that silently kills every focus indicator, a reduced-motion policy that hides content forever, a keyboard trap in a shared listener. Fix the system once, or fix a hundred widgets forever. Target WCAG 2.2 AA and treat these rules as the floor.

The cascade owns focus:

- Never reset `:focus-visible` with a high-specificity global rule. A reset at specificity (0,3,1) silently beats every `.class:focus-visible` restore at (0,2,0), and the site ships with zero focus indicators while every module believes it styled one. Audit computed specificity, not rule presence.
- The sanctioned shape: one zero-specificity default, `:where(html) :focus-visible { outline: 2px solid var(--color-focus) }`. Any single-class module rule overrides it. Every interactive element then either inherits a visible default or overrides it consciously. No element can fall through.
- `all: unset` and `outline: 0` on a component also erase the global default. A component that resets its own styles owes its own `:focus-visible` rule in the same file.
- A focus indicator must not depend on an animation. Reduced-motion policies set `animation: none`, and an animated-only indicator vanishes for exactly the users who toggled that setting. Pair every animated focus treatment with a static outline.

Reduced motion is a contract with teeth:

- A global kill (`animation: none; transition: none` under `prefers-reduced-motion` and the site's own quiet mode) is the right default, and it creates one obligation: no content may need an animation to become visible. `opacity: 0` base plus a reveal animation equals invisible forever under the kill. Reveal patterns rest visible and animate from visible.
- CSS cannot stop a GIF. An animating GIF longer than five seconds becomes a `<video muted loop controls>`: the encoder halves the bytes and the controls are the pause mechanism.
- JavaScript-driven loops (sprite flips, rAF cycles) do not hear CSS kills. Route them through one shared predicate that reads both the OS media query and the site's quiet flag, and check it per tick.
- Smooth scrolling passed as a JS argument (`behavior: 'smooth'`) overrides the CSS reduced-motion reset. Derive the behavior from the same predicate.

Ship the two switches every animated site owes its users:

- An effects switch (WCAG 2.2.2). Ambient loops longer than five seconds need a user-reachable stop. The OS media query is not enough: the mechanism must be reachable from the content. One persisted flag, one root class, one CSS kill block, one JS predicate.
- A single-key shortcut switch (WCAG 2.1.4). Bare letter, digit, and punctuation shortcuts must be disableable or remappable; Shift does not count as a modifier. Classify combos in one place: no Ctrl/Alt/Meta part and a length-one key means character shortcut, gated by the flag.
- Surface both behind a focus-revealed control next to the skip link. Keyboard and AT users find it on the first Tab; pointer users never see the chrome; the art stays intact.

Centralize keyboard policy:

- Every shortcut flows through one guard. One `shouldIgnore(event, combo)` function is the single place that exempts editable targets, checks the kill flag, drops unexpected modifiers, and skips claimed game input. A policy fix lands once.
- Activation keys pass through: a trap on Space or Enter must yield when focus sits on a link or button, or the trap silently disables every control on the page. This is the single most common self-inflicted keyboard bug in scene-based UIs.
- Global and capture-phase listeners need target guards. A game listener that `preventDefault`s Enter everywhere makes the skip link decorative. Guard: interactive target, let it pass; steering keys may stay global, activation keys may not.
- Never intercept Tab. A terminal that autocompletes on Tab lets Shift+Tab escape and documents the exit in the input's description. An "any key" gate filters to the keys it actually needs.
- Hidden slides, closed menus, and off-screen panes hold no tab stops: `inert`, `tabIndex={-1}`, or unmount.

Focus is state; manage its transitions:

- Disabling a focused control drops focus to `body` and strands the keyboard user. Swap `disabled` for `aria-disabled` plus a click guard when the control stays visible, or move focus to the successor before disabling.
- Everything that opens returns. Menus, dialogs, and popovers refocus their trigger on close, including the Escape path. Overlays that block input take focus on open. Native `<dialog>` with `showModal()` buys the trap, the backdrop, and Escape for free; custom overlays owe all three by hand.
- Pointer hover may grant focus, and only pointer-granted focus may be revoked by the pointer leaving. Blurring a keyboard-focused item on `pointerout` destroys the tab position.
- Autofocus on page mount steals the reading position from screen readers. Focus on first user intent instead.

Live regions are a broadcast discipline:

- One polite singleton beats scattered regions. A shared `notify(message)` renders one persistent `role='status'` element; every feature announces through it. Regions created with their first message already in place announce unreliably; the singleton exists from page load.
- Never put ticking values inside a live region. A countdown or seconds counter in `aria-live` floods the screen reader every second. Announce transitions (ready, verdict, track change), not renders.
- Announce what the pixels celebrate: game verdicts, copy confirmations, station changes, round summaries. If sighted users get feedback, AT users get the same sentence.

Names and state are the API:

- Toggles keep a fixed name and expose state through `aria-pressed`. A flipping name ("Sound on" / "Sound off") is ambiguous: state or action? Fixed name plus state is not. Visible state text rides an `aria-hidden` suffix.
- The visible label leads the accessible name (WCAG 2.5.3): a control labeled "SFX ON" and named "Sound effects" breaks voice control. Prefix match is the rule.
- `title` is not a name. It is unreachable by keyboard and touch. The same text goes in an `aria-label` or an adjacent visually-hidden element.
- `aria-controls`, `aria-labelledby`, and `aria-describedby` must reference mounted ids. Conditional rendering makes references dangle; make the attribute conditional too.
- Do not claim ARIA patterns you do not implement. `role='menu'` promises arrow-key navigation; plain buttons in a styled container promise nothing and work. Downgrade the role or build the pattern, never half of it.
- Decorative art is `aria-hidden`, including its `title` cousin the CSS `content` string (use the `content: "…" / ""` alt syntax). Meaningful canvas or SVG scenes get `role='img'` and a label; interactive canvases get `role='application'`, a label that teaches the keys, and the keys themselves.
- A composite widget announces its caption once. A labeled group whose caption repeats the image alt reads everything twice; empty the inner alt and let the group speak.

Contrast survives art direction:

- Alpha-composited inks fail silently. `rgb(255 255 255 / 42%)` on a dark panel is a different color than white; compute the composite before judging the ratio. Most muted-text failures are one alpha bump away from passing.
- Gradients are judged at the worst stop under the text, not the average.
- Fix contrast inside the palette: shift lightness within the hue, never swap the hue. The theme survives; the ratio passes. 4.5:1 for text, 3:1 for large text and UI component boundaries.
- Color is never the only channel. Links inside prose keep an underline; a hue shift alone fails the color-blind and the low-contrast display alike.

Pointer and keyboard are peers:

- Every drag has a key path: orbit a 3D view with arrows, resize with arrow steps, move with a roving cursor. Every hover reveal also opens on focus and closes on Escape.
- Activation fires on up-events with the pointer-away abort. Down-event activation is for latency-critical steering only.
- Device-motion actuation (shake) gets a disable and a UI equivalent (WCAG 2.5.4). The quiet-effects switch is a natural home.
- Targets reach 24×24 CSS px or inherit the spacing exception honestly. Tiny visuals keep their art with an invisible padded hit area.

Verification:

- The linter catches syntax (missing alt, missing button type). It cannot see cascade order, focus flow, live-region timing, or composite contrast. Those need the audit: specificity math on every focus rule, a keyboard-only walkthrough per route, a reduced-motion pass, computed ratios on real composites.
- State the accessibility contract per shared component in its doc: icon-only controls require labels, truncation keeps full text in the DOM, the kit button owns the focus ring. Consumers inherit conformance instead of re-deriving it.

## 14. Performance

- Set budgets per route class and per metric. Label each number as a target or a measurement. Re-measure after each serving-chain change.
- The levers, in impact order: ship less client JavaScript, keep a persistent layout shell, prerender the shells, stream the holes, serve from the platform cache, keep shared layouts cheap, aggregate upstream, seed the islands.
- Vendor scripts are client bundle. Scope each one to the smallest surface, load it after interaction, and never let one block first paint.
- Collect field vitals from production users. Separate shell paint from live-data readiness. A route can have a fast shell and a slow stream, and those are two different problems.
- Lazy-load heavy islands after intent. The shell renders without the heavy library.
- Virtualize every large list. Keep one DOM tree across viewports and let CSS own responsiveness.
- Never turn live data into static data to hit a metric. The goal is a fast first frame with honest values.

## 15. Testing

- Test the logic layer as pure functions: mappers, engines, math, policies. No network, no framework, no UI. This suite is the workhorse and runs in milliseconds.
- Verify component and page behavior in a real browser, end to end. Rendered-DOM unit tests are optional. Zero of them can be a valid decision. State the policy either way.
- Cross-platform conformance rides a spec plus frozen vectors. Generate the fixture from the reference implementation. Every port passes every case. Fix the code, never the fixture. Pin deliberate divergences in an allowlist with a written justification. Stamp the spec with provenance: source, commit, date, re-vendor instructions.
- Encode the architecture as tests. An import-graph walker enforces bundle boundaries. A registry test asserts coverage. A freshness test compares generated artifacts against a rebuild. Protocol files round-trip in-process without their transport.
- Test concurrency with deterministic fakes: fake locks, fake channels, fake timers, hostile payloads, killed peers. Two tabs run inside one test process.
- Table-driven suites carry a growth rule: a new variant must add its row.
- Gate every completion claim: typecheck, lint, unit tests, dead-code scan, build. Then probe reality: curl the page for seeds in the HTML, load it under hostile hydration settings, keep the analyzer score from regressing.

## 16. Process

The work loop, for a 20-minute fix and a multi-week feature alike:

1. Brainstorm the problem. Is this the right problem? What happens with no change at all?
2. Plan: affected files, sequence, risks.
3. Build step by step. Test and commit incrementally.
4. Review: machine review first, then a human owner.
5. Ship: merge, deploy, verify in production.
6. Compound: turn the learning into a doc update, a lint rule, or a solution note. Most teams skip this step, and it pays the most.

Specs:

- Under a day of work: no spec.
- One domain, unclear approach: maybe one page.
- Two or more domains: yes, with sign-off from the owners.
- Architecture changes: yes.
- Auth or money settlement: always.
- Risk beats size. A small auth fix still gets the spec.

A spec holds the problem, the approach, the alternatives, the affected domains, and the open questions. Implementation details belong in the PR. Write for humans.

Decisions get three homes. Architecture decisions go to the architecture doc. Pattern decisions go to the agents doc. Debugging learnings go to solution notes. A decision outside all three evaporates.

Done means: tests pass, a human approved, the change is deployed, and you verified it in production. Visually for UI, spot checks for data, one real transaction for money paths. Merged is not done. "PR approved" is not done.

PRs and reviews:

- One logical change per PR. The scope needs a paragraph? Split the PR.
- Imperative title under 70 characters. The summary carries the why.
- Review priorities: correctness and security first, architecture and scope second, readability and performance third. Tools own formatting.
- Three rounds on one thread? Get on a call.

Migration and deletion:

- Inventory before design. Prove what the page needs: every consumer, every fetch, every rendered field, the refresh paths. Decide which legacy bugs to preserve and which to fix.
- Contracts before code. Then build in layer order: fetcher, mapper, snapshot, server render, client freshness last.
- Decommission the replaced thing in the same PR. Deletion needs proof: zero callers, greps by bare name, and a check for out-of-repo callers. Webviews, callbacks, and external services call things grep cannot see.
- Delete the wire-mimic layer with the old integration: hand-written raw types and their validation schemas. Mappers and view-model types stay.
- Never edit legacy files to make new types fit. A shim stays short-lived and documented.
- A trimmed upstream fetch does not shrink the server-to-client payload. Two payloads, two checks.
- No time-relative labels inside a cached value. "Today" is request-time data. Never assume the server timezone.
- Canonical identity comes from the data contract, never from display labels.
- Optional display data never gates functionality. A missing statistic must not hide a working widget.

Follow-up ledgers:

- A ledger entry must be known, non-blocking, and better in a focused follow-up. A ledger is never permission to leave new problems behind.
- Every entry carries a problem statement and a concrete follow-up direction.
- Ledgers rot. On conflict, doctrine docs win.

## 17. Working with AI agents

- Keep one agent doc. Symlink every assistant's filename to it, so one source feeds every tool.
- Open the doc with the identity sentence and the objective function. Close each major doc with a never-do list: the forbidden move plus the sanctioned alternative.
- Keep the four-part rule shape from section 1: rule, reason, enforcement, exemptions.
- Give a standing self-check. Example for a web client: can this render on the server? Can I fetch less? Can I send less to the client? Can the result be cached? Can it load lazily? Must it block rendering?
- Point at precedents. Each rule names a canonical file. Agents copy the nearest precedent instead of inventing shapes.
- Draw stop-and-ask lines. A shared primitive needs owner sign-off. Unclear ownership means stop and ask.
- Suggest, never install. An agent proposes a new dependency with the tradeoff and never touches a lockfile without confirmation.
- Route the reading at the top of the doc: read the naming doc before new data files, and read the rendering doc before route work.
- Same-PR doc duties bind agents too. Index tables update with the change.
- Pin the framework generation and its current idioms in the doc. Agents check current docs before any framework API, never trained memory.
- With warning debt in the repo, scope lint to touched files, or the diff drowns in old noise.

## 18. Adoption

1. Write the identity sentence and the objective function into the agent doc.
2. Name the paradigm and the tie-breakers.
3. Stand up enforcement: restricted imports, complexity budgets, local lint rules, import-graph tests.
4. Define your data classes, the actionable-value test, and the threat model.
5. Build one route through the full pipeline as the canonical precedent.
6. Add the verification gates to CI, then start the three decision homes.

## 19. Anti-patterns

Each line names a forbidden move. The sections above hold the sanctioned alternative.

- A proxy route with a server-side fetch as its only job.
- A server render of a live value. The stream overwrites it on arrival.
- A fat record cached for a thin view. Projection in the render path.
- Server or stream data inside a UI store. An actionable value inside component state.
- A fetch loop over list items.
- A slow await in a shared layout.
- A route-level loading state over a rich shell.
- A fallback boundary around a seeded island. That fallback is dead code.
- Resumed stream deltas after a disconnect.
- Polling for stream-owned values.
- An unvalidated frame written to a store.
- A raw fetch-and-parse without status checks or a schema.
- Inline query keys. Scattered stale-time literals. Auth-expiry teardown in five places.
- Console calls in app code. Logging inside an error constructor. Branching on error message strings.
- A hand-rolled copy of a kit component.
- First-party barrel files.
- Hand-written memoization under a compiler.
- A skeleton over seeded rows.
- Placeholder params in static generation. They validate only the placeholder path.
- A hand edit to a generated artifact.
- "Fetch everything and cache."
