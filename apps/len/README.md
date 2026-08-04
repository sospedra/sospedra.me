# `len` 🍥

Safely access arrays' length property

Ported from [sospedra/len](https://github.com/sospedra/len) into this workspace. Zero dependencies now. TypeScript, ESM, `node:test`.

### Install

Add it to a workspace consumer:

```json
"len": "workspace:*"
```

### Usage

`len` will return the array target length or `0` 👀

Meaning that **non-array targets always return `0`**.

```ts
import len from 'len'

len([]) // 0
len([1, 2]) // 2
len(9) // 0
len('string') // 0
len(undefined) // 0
```

### Why?

Most of the errorceptions, bugsnags, sentry, etc. looks like:

> `Cannot read property 'length' of undefined`

And that makes me sad 🤷‍♀️

Also, by returning the length only of arrays **we ensure that it's iterable**.
Meaning that you can safely check for `.map`, `.reduce`, *et altri*

```ts
if (len(array)) array.map(myCallback)
```

Wonderful 😍
