import { animated, interpolate } from 'react-spring'

const CANVAS_SIZE = { ROWS: 6, COLUMNS: 6 }
const Vault = {
  anchors: {},
}

const coordinateToKey = (row, column) => `${row}-${column}`

const get = (row, column) => {
  return Vault.anchors[coordinateToKey(row, column)]
}

const set = (row, column, ref) => {
  Vault.anchors[coordinateToKey(row, column)] = ref
}

const register = (row, column) => {
  return (ref) => {
    set(row, column, ref)
    return true
  }
}

export const getPosition = (row, column) => {
  const element = get(row, column)

  return {
    top: element.offsetTop,
    left: element.offsetLeft,
  }
}

const canvasStyles = {
  margin: 0,
  padding: 0,
  position: "absolute",
  top: 0,
  left: 0,
  display: "inline-flex",
  "flex-direction": "column",
  background: "linear-gradient(to bottom, #430840 0%, #690b63 50%)",
  "font-family": `"Open Sans", "lucida grande", "Segoe UI", arial, verdana, "lucida sans unicode", tahoma, sans-serif`,
}

export const Canvas = (props) => (
  <React.Fragment>
    <animated.div style={{
      ...canvasStyles,
      transform: interpolate(
        [props.left, props.top],
        (left, top) => `translate(-${left}px, -${top}px)`
      )
    }}>
      {Array(CANVAS_SIZE.ROWS).fill().map((_, row) => (
        <div className="row" key={row}>
          {Array(CANVAS_SIZE.COLUMNS).fill().map((_, column) => (
            <div
              className="cell"
              key={column}
              ref={register(row, column)}
            />
          ))}
        </div>
      ))}
    </animated.div>

    <style jsx>{`
      .row {
        display: flex;
      }

      .cell {
        width: 100vw;
        height: 100vh;
      }

    `}</style>

    <style jsx global>{`
      html, body {
        overflow: hidden;
      }
    `}</style>
  </React.Fragment>
)