# logatim

Isomorphic console logger with log levels and chainable ANSI/CSS styles. TypeScript ESM port of [sospedra/logatim](https://github.com/sospedra/logatim). Zero runtime dependencies.

## Usage

```ts
import logatim from 'logatim'

logatim.blue.bgYellow.bold.info("It's like reading english")

// each print is independent, zero memories
logatim.green.info('No background color nor bold here')

// concat different styles in one line
logatim.red('R').green('G').blue('B').info()

// levels gate the output
logatim.getLevel() // 'WARN' by default
logatim.debug('hidden, debug is under warn')
logatim.setLevel('debug')
logatim.debug('printed')
```

## API

- Level methods: `trace`, `debug`, `info`, `warn`, `error`. They print and return `undefined`. They are not chainable.
- `getLevel()` returns the current level name. `setLevel(name | number)` accepts `'trace'` through `'silent'` or `0`-`5` and throws on anything else.
- `raw(message?)` returns the formatted output instead of printing. Node gets an ANSI string. Browser gets a `[message, ...styles]` array for `%c` printing.
- `setEnv('node' | 'browser')` forces the output format. The environment is auto-detected.
- Colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`.
- Backgrounds: the same palette as `bgBlack` through `bgGrey`.
- Sets: `bold`, `dim`, `italic`, `underline`, `blink`, `inverse`, `hidden`, `strikethrough`.
- In the browser, `setLevel` persists to `localStorage` with a session-cookie fallback. New page loads restore it.
- The level is a module singleton. Set it once and every importing file sees it.

## Development

```sh
pnpm --filter logatim test
pnpm --filter logatim lint
pnpm --filter logatim typecheck
```

The test suite is the original tap suite ported to `node:test`. It pins output parity with the 2016 library.

## Changes from the original

- TypeScript, ESM, and `node:test` replace ES5, CommonJS, webpack bundles, and tap.
- The `.silent()` method is gone. It threw on call in the original because `console.silent` does not exist.
- The browser reads the persisted level at startup. The original inverted that check and read storage only in node, where none exists.
- The REPL `inspect` stub is gone. Modern node ignores it.
