const CANVAS_SIZE = { ROWS: 4, COLUMNS: 2 }
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

export const Canvas = () => (
  <React.Fragment>
    <div className="canvas">
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
    </div>

    <style jsx>{`
      .canvas {
        background: linear-gradient(to bottom, #430840 0%,#690b63 50%);
        font-family: "Open Sans", "lucida grande", "Segoe UI", arial, verdana, "lucida sans unicode", tahoma, sans-serif;
        margin: 0;
        padding: 0;
        position: absolute;
        top: 0;
        left: 0;
        display: inline-flex;
        flex-direction: column;
      }

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