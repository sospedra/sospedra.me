import React from 'react'

const Title = (props) => (
  <React.Fragment>
    <h2>
      ｊａｖａｓｃｒｉｐｔ  ｈａｃｋｅｒ<br />
      ｆｒｏｎｔｅｎｄ  ｅｎｇｉｎｅｅｒ
    </h2>
    <h3>
      ヌル
    </h3>

    <style jsx>{`
      h2 {
        color: #ea1195;
        font-size: calc(1em + 1vw);
        text-shadow: -1px 1px 0 #ffb9b9;
      }

      h3 {
        font-size: 32px;
        text-shadow: -1px 1px 0 #184854;
        color: silver;
      }
    `}</style>
  </React.Fragment>
)

export default Title
