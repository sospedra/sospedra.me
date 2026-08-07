# sti (semverToInt)

Safely convert any semver to an integer for easy comparisons.

Port of [sospedra/semvertoint](https://github.com/sospedra/semvertoint) into this monorepo. Same algorithm, modern toolchain: TypeScript, `node --test`, biome, tsc build.

### Install

```sh
npm install @sospedra/sti
```

### Usage

```ts
import semverToInt from '@sospedra/sti'

semverToInt('12.0.1') // 130000100001
semverToInt('190.10.0') > semverToInt('190.9.9999') // true
```

Useful for migration policies and changelogs. Maintain only the `package.json` version and derive every historic comparison from it.

#### Custom base

The base sets the digit budget per segment. The default base is 10. The function rounds any base up to an even integer.

```ts
semverToInt('13.3.7') // 140000400007
semverToInt('13.3.7', 12) // 14000004000007
```

A segment that outgrows its budget overflows into the next one:

```ts
// wrong: minor overflowed into major
semverToInt('13.300000.7') // 170000100007
// because it compares greater than
semverToInt('15.0.0') // 160000100000
// increase the base to restore the order
semverToInt('13.300000.7', 12) // 14300001000007
semverToInt('14.0.0', 12) // 15000001000000
```

### Scripts

```sh
pnpm --filter @sospedra/sti test       # node --test
pnpm --filter @sospedra/sti build      # tsc emit to dist/
pnpm --filter @sospedra/sti lint       # biome check
pnpm --filter @sospedra/sti typecheck  # tsc --noEmit
```
