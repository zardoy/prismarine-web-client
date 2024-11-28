#!/usr/bin/env node

const express = require('express')
const netApi = require('net-browserify')
const compression = require('compression')
const path = require('path')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
let siModule
try {
  siModule = require('systeminformation')
} catch (err) { }

// Create our app
const app = express()

const isProd = process.argv.includes('--prod')
app.use(compression())
app.use(cors())
app.use(netApi({ allowOrigin: '*' }))
if (!isProd) {
  app.use('/sounds', express.static(path.join(__dirname, './generated/sounds/')))
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
if (isProd) {
  // add headers to enable shared array buffer
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    next()
  })
  app.use(express.static(path.join(__dirname, './dist')))
}

const numArg = process.argv.find(x => x.match(/^\d+$/))
const port = (require.main === module ? numArg : undefined) || 8080

// Start the server
const server =
  app.listen(port, async function () {
    console.log('Proxy server listening on port ' + server.address().port)
    if (siModule && isProd) {
      const _interfaces = await siModule.networkInterfaces()
      const interfaces = Array.isArray(_interfaces) ? _interfaces : [_interfaces]
      let netInterface = interfaces.find(int => int.default)
      if (!netInterface) {
        netInterface = interfaces.find(int => !int.virtual) ?? interfaces[0]
        console.warn('Failed to get the default network interface, searching for fallback')
      }
      if (netInterface) {
        const address = netInterface.ip4
        console.log(`You can access the server on http://localhost:${port} or http://${address}:${port}`)
      }
    }
  })

module.exports = { app }
