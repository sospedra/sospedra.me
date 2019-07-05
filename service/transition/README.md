useTransition
=============

Use this hook to being able to execute anything before navigate out of the component.
Very useful for rendering transitions out.

> + And for the transitions in?
> - Use normal lifecycle hooks

### `useTransition`

Returns a `transition` object. This bad boy contains all the magic:

```
{
  hasRequestedUnmount: boolean, // after requestUnmount() and before unmount()
  willUnmount: boolean, // after unmount()
  unmount: () => void, // when transition out is done, i.e.: animation ended
  requestUnmount: () => void, // when want to transition out, i.e.: click on link
  reset: () => void, // start over; usually this is done for you
}
```

### lifecycle

|                   | hasRequestedUnmount | willUnmount | Trigger            | Comment                                               |
|-------------------|---------------------|-------------|--------------------|-------------------------------------------------------|
| idle              | `false`             | `false`     | `reset()`          | Normal state of the app                               |
| start transition  | `true`              | `false`     | `requestUnmount()` | Start your animations, requests, etc.                 |
| finish transition | `true`              | `true`      | `unmount()`        | Exec when everything is done and want to navigate out |

### `Link`

Considering that most of the time the navigation happens after a click on a link I just added this component to ease the usage.
`Link` automatically triggers `requestUnmount`, await for `willUnmount` to be `true`, then navigate to the `href` and finally `reset` the state.

Automagically! You only have to take care of the `unmount()` call.

Let's focus on this example.

```js
import { Link, useTransition } from 'transition'

const App = () => {
  const { unmount, hasRequestedUnmount } = useTransition()

  useEffect(() => {
    if (hasRequestedUnmount) {
      // async magic baby
      fetchMyThing().then(unmount)
    }
  })

  return (
    <div>
      {hasRequestedUnmount && <LoadingSpinner />}
      <p>Michael JSON was the best singer ever</p>
      <Link href='/anotherpage'>bitesthedust</Link>
    </div>
  )
}
```

The lifecycle will be:

1. Render the `p` and the `Link`
2. When click on `Link` the `useEffect` will `requestMyThing`
3. `LoadingSpinenr` is shown
4. After an undefined amount of time (yes! no hardcoded miliseconds) it'll exec `unmount`
5. `Link` will smoothly navigate to `/anotherpage`
6. ???
7. Profit!!


### `Provider`

Since this module relies on React context we need a provider to do the **setup**.
Simply import it and paste at before all the transitions.

```js
import { ProviderTransition } from 'transition'

const App = () => (
  <ProviderTransition>
    {/* your app */}
  </ProviderTransition>
)
```

### `TransitionCTX`

If you need to access the context outside a React component the `TransitionCTX` is exposed.
Be aware this may break things 👀
