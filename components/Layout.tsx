import * as React from 'react'

const Layout: React.FunctionComponent<{}> = ({ children }) => (
  <>
    <div>
      {children}
    </div>
    <style jsx>{`
      div {
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
      }
    `}</style>
  </>
)

export default Layout
