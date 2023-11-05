#!/usr/bin/env node

const express = require('express')
const netApi = require('net-browserify')
const compression = require('compression')
const path = require('path')
const cors = require('cors')
const https = require('https')
const fs = require('fs')

// Create our app
const app = express()

const isProd = process.argv.includes('--prod')
app.use(compression())
app.use(netApi({ allowOrigin: '*' }))
if (!isProd) {
  app.use('/blocksStates', express.static(path.join(__dirname, './prismarine-viewer/public/blocksStates')))
  app.use('/textures', express.static(path.join(__dirname, './prismarine-viewer/public/textures')))
}
// patch config
app.get('/config.json', (req, res, next) => {
  // read original file config
  let config = {}
  try {
    config = require('./config.json')
  } catch {
    try {
      config = require('./dist/config.json')
    } catch { }
  }
  res.json({
    ...config,
    'defaultProxy': '', // use current url (this server)
  })
})
app.use(express.static(path.join(__dirname, './dist')))

const portArg = process.argv.indexOf('--port')
const port = (require.main === module ? process.argv[2] : portArg !== -1 ? process.argv[portArg + 1] : undefined) || 8080

// Start the server
const server = isProd ?
  undefined :
  app.listen(port, function () {
    console.log('Server listening on port ' + server.address().port)
  })

module.exports = { app }
