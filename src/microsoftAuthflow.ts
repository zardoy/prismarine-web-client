export default async ({ tokenCaches, proxyBaseUrl, setProgressText = (text) => { }, setCacheResult, clientOptions }) => {
  const authEndpoint = 'http://localhost:3000/'
  const sessionEndpoint = 'http://localhost:3000/session'
  // try {
  //   const url = proxyBaseUrl + '/api/vm/net/connect'
  //   const result = await fetch(url)
  //   const json = await result.json()
  //   authEndpoint = json.capabilities.authEndpoint
  //   if (!authEndpoint) throw new Error('No auth endpoint')
  // } catch (err) {
  //   console.error(err)
  //   throw new Error(`Selected proxy server ${proxyBaseUrl} does not support Microsoft authentication`)
  // }
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
                clientOptions.onMsaCode(json)
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
      return restoreDates(result)
    }
  }
  return {
    authFlow,
    sessionEndpoint
  }
}

// restore dates from strings
const restoreDates = (json) => {
  if (typeof json === 'object' && json) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'string' && value.endsWith('Z')) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          json[key] = date
        }
      }
      if (typeof value === 'object') {
        restoreDates(value)
      }
    }
  }

  return json
}
