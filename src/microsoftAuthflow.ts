export default async ({ tokenCaches, proxyBaseUrl, setProgressText = (text) => { }, setCacheResult }) => {
  let onMsaCodeCallback
  // const authEndpoint = 'http://localhost:3000/'
  // const sessionEndpoint = 'http://localhost:3000/session'
  let authEndpoint = ''
  let sessionEndpoint = ''
  try {
    if (!proxyBaseUrl.startsWith('http')) proxyBaseUrl = `${isPageSecure() ? 'https' : 'http'}://${proxyBaseUrl}`
    const url = proxyBaseUrl + '/api/vm/net/connect'
    const result = await fetch(url)
    const json = await result.json()
    authEndpoint = urlWithBase(json.capabilities.authEndpoint, proxyBaseUrl)
    sessionEndpoint = urlWithBase(json.capabilities.sessionEndpoint, proxyBaseUrl)
    if (!authEndpoint) throw new Error('No auth endpoint')
  } catch (err) {
    console.error(err)
    throw new Error(`Selected proxy server ${proxyBaseUrl} does not support Microsoft authentication`)
  }
  const authFlow = {
    async getMinecraftJavaToken () {

      setProgressText('Authenticating with Microsoft account')
      let result = null
      await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenCaches),
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}: ${await response.text()}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder('utf8')

        const processText = ({ done, value = undefined as Uint8Array | undefined }) => {
          if (done) {
            return
          }

          const processChunk = (chunkStr) => {
            try {
              const json = JSON.parse(chunkStr)
              if (json.user_code) {
                onMsaCodeCallback(json)
                // this.codeCallback(json)
              }
              if (json.error) throw new Error(json.error)
              if (json.token) result = json
              if (json.newCache) setCacheResult(json.newCache)
            } catch (err) {
            }
          }

          const strings = decoder.decode(value)

          for (const chunk of strings.split('\n\n')) {
            processChunk(chunk)
          }

          return reader.read().then(processText)
        }
        return reader.read().then(processText)
      })
      if (!window.crypto && !isPageSecure()) throw new Error('Crypto API is available only in secure contexts. Be sure to use https!')
      const restoredData = await restoreData(result)
      restoredData.certificates.profileKeys.private = restoredData.certificates.profileKeys.privatePEM
      return restoredData
    }
  }
  return {
    authFlow,
    sessionEndpoint,
    setOnMsaCodeCallback (callback) {
      onMsaCodeCallback = callback
    }
  }
}

function isPageSecure () {
  return window.location.protocol === 'https:'
}

// restore dates from strings
const restoreData = async (json) => {
  const promises = [] as Array<Promise<void>>
  if (typeof json === 'object' && json) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'string') {
        promises.push(tryRestorePublicKey(value, key, json))
        if (value.endsWith('Z')) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            json[key] = date
          }
        }
      }
      if (typeof value === 'object') {
        // eslint-disable-next-line no-await-in-loop
        await restoreData(value)
      }
    }
  }

  await Promise.all(promises)

  return json
}

const tryRestorePublicKey = async (value: string, name: string, parent: { [x: string]: any }) => {
  value = value.trim()
  if (!name.endsWith('PEM') || !value.startsWith('-----BEGIN RSA PUBLIC KEY-----') || !value.endsWith('-----END RSA PUBLIC KEY-----')) return
  const der = pemToArrayBuffer(value)
  const key = await window.crypto.subtle.importKey(
    'spki', // Specify that the data is in SPKI format
    der,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    true,
    ['encrypt'] // Specify key usages
  )
  const originalName = name.replace('PEM', '')
  const exported = await window.crypto.subtle.exportKey('spki', key)
  const exportedBuffer = new Uint8Array(exported)
  parent[originalName] = {
    export () {
      return exportedBuffer
    }
  }
}

function pemToArrayBuffer (pem) {
  // Fetch the part of the PEM string between header and footer
  const pemHeader = '-----BEGIN RSA PUBLIC KEY-----'
  const pemFooter = '-----END RSA PUBLIC KEY-----'
  const pemContents = pem.slice(pemHeader.length, pem.length - pemFooter.length).trim()
  const binaryDerString = atob(pemContents.replaceAll(/\s/g, ''))
  const binaryDer = new Uint8Array(binaryDerString.length)
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.codePointAt(i)!
  }
  return binaryDer.buffer
}

const urlWithBase = (url: string, base: string) => {
  const urlObj = new URL(url, base)
  base = base.replace(/^https?:\/\//, '')
  urlObj.host = base.includes(':') ? base : `${base}:${isPageSecure() ? '443' : '80'}`
  return urlObj.toString()
}
