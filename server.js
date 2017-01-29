const express = require('express')
const path = require('path')
const compression = require('compression')
const helmet = require('helmet')

const app = express()

app.use(helmet())
app.use(compression())
app.use('/', express.static(path.join(__dirname, 'public')))

app.listen(1337, function () {
  console.log('Example app listening on port 1337!')
})
