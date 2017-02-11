import Inferno from 'inferno'
import './App.css'

const App = () => (
  <div className='App'>
    <div className='App-header'>
      <h2>Welcome to sospedra.me</h2>
    </div>
    <p className='App-intro'>
      To get started, edit <code>src/App.js</code> and save to reload.
    </p>
    <img src={process.env.PUBLIC_URL + '/images/react.png'} />
  </div>
)

export default App
