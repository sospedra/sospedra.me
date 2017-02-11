const express = require('express')
const path = require('path')
const compression = require('compression')
const helmet = require('helmet')

const PORT = process.env.port || 1337
const app = express()

app.use(helmet())
app.use(compression())
app.use('/', express.static(path.join(__dirname, 'build')))

app.listen(PORT, () => {
  console.info(`sospedra.me server up and running at :${PORT}`)
})
