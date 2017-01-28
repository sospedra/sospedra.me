import * as styles from './styles'

export default (props) => (
  <div {...styles.background}>
    <main>
      <h2 {...styles.name}>Ruben</h2>
      <h1 {...styles.lastName}>Sospedra</h1>

      <ul>
        <li>About</li>
        <li>Portfolio</li>
        <li>Contact</li>
        <li>Credits</li>
      </ul>
    </main>
  </div>
)
