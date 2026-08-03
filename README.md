[sospedra.me](https://sospedra.me)
==================================

The Rubén Sospedra's website source code.
Javascript hacker.
Fullstack engineer.

Next.js 16 app router. Node 24 and pnpm 11 (`asdf install`).
`pnpm dev` to develop. `pnpm build` to build. `pnpm test` runs the suites, tsc and biome.
Deps are pinned exact. `.npmrc` sets save-exact so `pnpm add` keeps it that way.

Layout: routes in `app/`, shared code in `services/`, content in `repo/`, tooling in `scripts/`.
Papers live in `repo/papers/<slug>/` as mdx plus metadata.json.
User-run tasks are cli commands: `pnpm cli` lists them.

*Handcrafted with <3 in Barcelona*
