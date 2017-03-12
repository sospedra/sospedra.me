import Inferno from 'inferno'
import { Link } from 'inferno-router'
import './Home.css'

const BG_SPRITE = 'images/street-sprite.svg'

const Home = () => (
  <div>
    <main className='menu'>
      <h1 className='title'>
        Rub&eacute;n Sospedra
      </h1>
      <h2 className='sub-title'>
        javascript hacker * front-end developer
      </h2>
    </main>

    <figure
      className='sprite move-slide'
      alt='retrowave-skyline-moving-left-as-background'
      style={{
        animationDuration: `${window.innerWidth / 138}s`,
        backgroundImage: `url(${process.env.PUBLIC_URL}/${BG_SPRITE})`
      }}
    />
  </div>
)

export default Home
