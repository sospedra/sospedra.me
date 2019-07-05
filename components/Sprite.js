import React from 'react'

const TIME = '5s'
const DELAY = '2s'

const Sprite = (props) => {
  return (
    <React.Fragment>
      <figure
        alt='retrowave-skyline-moving-left-as-background'
        {...props}
      />

      <style jsx>{`
      figure {
        background-size: contain;
        bottom: 0;
        height: calc(50% - 10vw);
        left: 0;
        position: absolute;
        width: 400%;
        margin: 0;
        background-image: url(static/street-sprite.svg);
        animation: spring-left ${TIME} ${DELAY} forwards;
        z-index: -1;
      }

      @keyframes spring-left {
        0% { transform: translate(0); }
        100% { transform: translate(-50%); }
      }
    `}</style>
    </React.Fragment>
  )
}

export default Sprite
