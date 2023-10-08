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
let lastVersion = ''
app.post('/lastVersion', (req, res) => {
  res.send(lastVersion.toString())
})
if (!isProd) {
  app.use('/blocksStates', express.static(path.join(__dirname, './prismarine-viewer/public/blocksStates')))
  app.use('/textures', express.static(path.join(__dirname, './prismarine-viewer/public/textures')))
}
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
