import Inferno from 'inferno'
import './Home.css'
import './Glitch.css'

const BG_SPRITE = 'images/street-sprite.svg'
const GOLDEN_DIVIDER = 138

const Home = () => (
  <div>
    <main className='menu'>
      <h1 className='title'>
        <a href='https://twitter.com/sospedra_r' target='_blank'>
          Rub&eacute;n Sospedra
        </a>
      </h1>
      <h2 className='sub-title'>
        ｊａｖａｓｃｒｉｐｔ  ｈａｃｋｅｒ<br />
        ｆｒｏｎｔｅｎｄ  ｅｎｇｉｎｅｅｒ
      </h2>
      <h3 className='glitch kanji' data-text='吃腊肉'>
        吃腊肉
      </h3>
    </main>

    <figure
      className='sprite move-slide'
      alt='retrowave-skyline-moving-left-as-background'
      style={{
        animationDuration: `${window.innerWidth / GOLDEN_DIVIDER}s`,
        backgroundImage: `url(${process.env.PUBLIC_URL}/${BG_SPRITE})`
      }}
    />
  </div>
)

export default Home
