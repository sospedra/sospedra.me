import React from "react"
import { config, animated, useSpring } from "react-spring"

const styles = {
  backgroundSize: "contain",
  bottom: 0,
  height: "50vh",
  left: 0,
  position: "absolute" as "absolute",
  width: "400vw",
  backgroundImage: "url(/street-sprite.svg)",
  zIndex: -1,
  margin: 0,
}

const SpriteCity: React.FunctionComponent<{}> = () => {
  const animation = useSpring({
    from: { transform: "translate(0vw)" },
    to: { transform: "translate(-300vw)" },
    config: config.molasses,
  })

  return <animated.figure style={{ ...styles, ...animation }} />
}

export default SpriteCity
