import Inferno from 'inferno'
import { Link } from 'inferno-router'
import './Home.css'

const Home = () => (
  <div className='Home'>
    <nav>
      <Link to='/about'>About</Link>
    </nav>
    <div className='Home-header'>
      <h2>Welcome to sospedra.me</h2>
    </div>
    <p className='Home-intro'>
      To get started, edit <code>src/Home.js</code> and save to reload.
    </p>
    <img src={process.env.PUBLIC_URL + '/images/react.png'} />
  </div>
)

export default Home
