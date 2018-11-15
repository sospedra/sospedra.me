import React from 'react'

const Title = (props) => (
  <h1>
    <a
      href='https://twitter.com/sospedra_r'
      target='_blank'
    >
      Rub&eacute;n Sospedra
    </a>

    <style jsx>{`
      h1 {
        text-align: center;
      }
      a {
        color: #6df7ea;
        font-family: lazer84, monospace;
        font-size: calc(1.8em + 1vw);
        text-decoration: none;
        text-shadow: 1.9px 2px 0 #3f2d43;
        text-transform: uppercase;
      }
    `}</style>
  </h1>
)

export default Title
