import * as React from 'react'
import Link from './Link'

const Layout: React.FunctionComponent<{}> = ({ children }) => (
  <>
    <div>
      <header>
        <nav>
          <Link href="/">
            Home
          </Link>{' '}
          |{' '}
          <Link href="/about">
            About
          </Link>{' '}
          |{' '}
          <Link href="/initial-props">
            With Initial Props
          </Link>
        </nav>
      </header>
      {children}
      <footer>
        <hr />
        <span>I'm here to stay (Footer)</span>
      </footer>
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
