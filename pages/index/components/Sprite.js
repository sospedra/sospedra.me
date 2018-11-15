import React from 'react'

const Sprite = () => (
  <React.Fragment>
    <figure
      alt='retrowave-skyline-moving-left-as-background'
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
        animation: spring-left 5s 2s forwards;
        z-index: -1;
      }

      @keyframes spring-left {
        0% { transform: translate(0); }
        100% { transform: translate(-50%); }
      }
    `}</style>
  </React.Fragment>
)

export default Sprite
