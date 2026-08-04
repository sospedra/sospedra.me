# rfm

Request for maintainers. Track OSS repositories that call for a maintainer or support.

Port of [sospedra/rfm](https://github.com/sospedra/rfm). Every request is a GitHub issue labeled `search` on that repo. The app reads them through the GitHub Search API. The submit wizard pre-fills a new issue with the repo metadata as JSON.

## Run

```
pnpm --filter rfm dev
```

## Stack

React 19, Vite 8, react-router 8, SWR 2, Tailwind 4, @react-spring/web 10.
