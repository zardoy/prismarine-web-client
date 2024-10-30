/* global XMLHttpRequest */

// Custom DNS resolver made by SiebeDW. Powered by google dns.
// Supported: SRV (not all errors support)
module.exports.resolveSrv = function (hostname, callback) {
  const Http = new XMLHttpRequest()
  const url = `https://dns.google.com/resolve?name=${hostname}&type=SRV`
  Http.open('GET', url)
  Http.responseType = 'json'
  Http.send()

  Http.onload = function () {
    const { response } = Http
    if (response.Status === 3) {
      const err = new Error('querySrv ENOTFOUND')
      err.code = 'ENOTFOUND'
      callback(err)
      return
    }
    if (!response.Answer || response.Answer.length < 1) {
      const err = new Error('querySrv ENODATA')
      err.code = 'ENODATA'
      callback(err)
      return
    }
    const willreturn = []
    for (const object of response.Answer) {
      const data = object.data.split(' ')
      if (data[3] === undefined || data[2] === undefined) continue
      willreturn.push({
        priority: data[0],
        weight: data[1],
        port: data[2],
        name: data[3]
      })
    }
    console.log(willreturn)
    callback(null, willreturn)
  }
}
