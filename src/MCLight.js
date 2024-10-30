var Module = Module === undefined ? {} : Module
const ENVIRONMENT_IS_WEB = true
const ENVIRONMENT_IS_WORKER = false
const ENVIRONMENT_IS_NODE = false
if (ENVIRONMENT_IS_NODE) {
}
let moduleOverrides = { ...Module }
let arguments_ = []
let thisProgram = './this.program'
let quit_ = (status, toThrow) => {
  throw toThrow
}
let scriptDirectory = ''
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory)
  }
  return scriptDirectory + path
}
let readAsync; let readBinary
if (ENVIRONMENT_IS_NODE) {
  const fs = require('fs')
  const nodePath = require('path')
  scriptDirectory = __dirname + '/'
  readBinary = filename => {
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename)
    const ret = fs.readFileSync(filename)
    return ret
  }
  readAsync = async (filename, binary = true) => {
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename)
    return new Promise((resolve, reject) => {
      fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
        if (err) reject(err)
        else resolve(binary ? data.buffer : data)
      })
    })
  }
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replaceAll('\\', '/')
  }
  arguments_ = process.argv.slice(2)
  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }
  process.on('uncaughtException', ex => {
    if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
      throw ex
    }
  })
  quit_ = (status, toThrow) => {
    process.exitCode = status
    throw toThrow
  }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href
  } else if (typeof document !== 'undefined' && document.currentScript) {
    scriptDirectory = document.currentScript.src
  }
  if (scriptDirectory.startsWith('blob:')) {
    scriptDirectory = ''
  } else {
    scriptDirectory = scriptDirectory.slice(0, Math.max(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1))
  }
  {
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = url => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url, false)
        xhr.responseType = 'arraybuffer'
        xhr.send(null)
        return new Uint8Array(xhr.response)
      }
    }
    readAsync = async url => {
      if (isFileURI(url)) {
        return new Promise((reject, resolve) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', url, true)
          xhr.responseType = 'arraybuffer'
          xhr.onload = () => {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
              resolve(xhr.response)
            }
            reject(xhr.status)
          }
          xhr.onerror = reject
          xhr.send(null)
        })
      }
      return fetch(url, { credentials: 'same-origin' }).then(async response => {
        if (response.ok) {
          return response.arrayBuffer()
        }
        throw new Error(response.status + ' : ' + response.url)
      })
    }
  }
} else {
}
const out = Module['print'] || console.log.bind(console)
const err = Module['printErr'] || console.error.bind(console)
Object.assign(Module, moduleOverrides)
moduleOverrides = null
if (Module['arguments']) arguments_ = Module['arguments']
if (Module['thisProgram']) thisProgram = Module['thisProgram']
if (Module['quit']) quit_ = Module['quit']
let wasmBinary
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary']
let wasmMemory
let ABORT = false
let EXITSTATUS
let HEAP8; let HEAPU8; let HEAP16; let HEAPU16; let HEAP32; let HEAPU32; let HEAPF32; let HEAPF64
function updateMemoryViews() {
  const b = wasmMemory.buffer
  Module['HEAP8'] = HEAP8 = new Int8Array(b)
  Module['HEAP16'] = HEAP16 = new Int16Array(b)
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b)
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(b)
  Module['HEAP32'] = HEAP32 = new Int32Array(b)
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(b)
  Module['HEAPF32'] = HEAPF32 = new Float32Array(b)
  Module['HEAPF64'] = HEAPF64 = new Float64Array(b)
}
const __ATPRERUN__ = []
const __ATINIT__ = []
const __ATPOSTRUN__ = []
let runtimeInitialized = false
function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] === 'function') Module['preRun'] = [Module['preRun']]
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
  runtimeInitialized = true
  callRuntimeCallbacks(__ATINIT__)
}
function postRun() {
  if (Module['postRun']) {
    if (typeof Module['postRun'] === 'function') Module['postRun'] = [Module['postRun']]
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb)
}
function addOnInit(cb) {
  __ATINIT__.unshift(cb)
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb)
}
let runDependencies = 0
let runDependencyWatcher = null
let dependenciesFulfilled = null
function addRunDependency(id) {
  runDependencies++
  Module['monitorRunDependencies']?.(runDependencies)
}
function removeRunDependency(id) {
  runDependencies--
  Module['monitorRunDependencies']?.(runDependencies)
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher)
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      const callback = dependenciesFulfilled
      dependenciesFulfilled = null
      callback()
    }
  }
}
function abort(what) {
  Module['onAbort']?.(what)
  what = 'Aborted(' + what + ')'
  err(what)
  ABORT = true
  EXITSTATUS = 1
  what += '. Build with -sASSERTIONS for more info.'
  const e = new WebAssembly.RuntimeError(what)
  throw e
}
const dataURIPrefix = 'data:application/octet-stream;base64,'
const isDataURI = filename => filename.startsWith(dataURIPrefix)
var isFileURI = filename => filename.startsWith('file://')
let wasmBinaryFile
function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary)
  }
  if (readBinary) {
    return readBinary(file)
  }
  throw 'both async and sync fetching of the wasm failed'
}
function getBinaryPromise(binaryFile) {
  if (!wasmBinary) {
    return readAsync(binaryFile).then(
      response => new Uint8Array(response),
      () => getBinarySync(binaryFile),
    )
  }
  return Promise.resolve().then(() => getBinarySync(binaryFile))
}
function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile)
    .then(async binary => WebAssembly.instantiate(binary, imports))
    .then(receiver, reason => {
      err(`failed to asynchronously prepare wasm: ${reason}`)
      abort(reason)
    })
}
function instantiateAsync(binary, binaryFile, imports, callback) {
  if (
    !binary &&
    typeof WebAssembly.instantiateStreaming === 'function' &&
    !isDataURI(binaryFile) &&
    !isFileURI(binaryFile) &&
    !ENVIRONMENT_IS_NODE &&
    typeof fetch === 'function'
  ) {
    return fetch(binaryFile, { credentials: 'same-origin' }).then(async response => {
      const result = WebAssembly.instantiateStreaming(response, imports)
      return result.then(callback, (reason) => {
        err(`wasm streaming compile failed: ${reason}`)
        err('falling back to ArrayBuffer instantiation')
        return instantiateArrayBuffer(binaryFile, imports, callback)
      })
    })
  }
  return instantiateArrayBuffer(binaryFile, imports, callback)
}
function getWasmImports() {
  return { a: wasmImports }
}
function createWasm() {
  const info = getWasmImports()
  function receiveInstance(instance, module) {
    wasmExports = instance.exports
    wasmMemory = wasmExports['i']
    updateMemoryViews()
    addOnInit(wasmExports['j'])
    removeRunDependency('wasm-instantiate')
    return wasmExports
  }
  addRunDependency('wasm-instantiate')
  function receiveInstantiationResult(result) {
    receiveInstance(result['instance'])
  }
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance)
    } catch (e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`)
      return false
    }
  }
  if (!wasmBinaryFile) wasmBinaryFile = new URL('MCLight.wasm', import.meta.url).toString()
  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult)
  return {}
}
function js_getChunkAt(x, y, z) {
  console.log('getChunkAt', x, y, z)
  return window.getChunkAt(x, y, z)
}
function ExitStatus(status) {
  this.name = 'ExitStatus'
  this.message = `Program terminated with exit(${status})`
  this.status = status
}
var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    callbacks.shift()(Module)
  }
}
const noExitRuntime = Module['noExitRuntime'] || true
class ExceptionInfo {
  constructor(excPtr) {
    this.excPtr = excPtr
    this.ptr = excPtr - 24
  }
  set_type(type) {
    HEAPU32[(this.ptr + 4) >> 2] = type
  }
  get_type() {
    return HEAPU32[(this.ptr + 4) >> 2]
  }
  set_destructor(destructor) {
    HEAPU32[(this.ptr + 8) >> 2] = destructor
  }
  get_destructor() {
    return HEAPU32[(this.ptr + 8) >> 2]
  }
  set_caught(caught) {
    caught = caught ? 1 : 0
    HEAP8[this.ptr + 12] = caught
  }
  get_caught() {
    return HEAP8[this.ptr + 12] != 0
  }
  set_rethrown(rethrown) {
    rethrown = rethrown ? 1 : 0
    HEAP8[this.ptr + 13] = rethrown
  }
  get_rethrown() {
    return HEAP8[this.ptr + 13] != 0
  }
  init(type, destructor) {
    this.set_adjusted_ptr(0)
    this.set_type(type)
    this.set_destructor(destructor)
  }
  set_adjusted_ptr(adjustedPtr) {
    HEAPU32[(this.ptr + 16) >> 2] = adjustedPtr
  }
  get_adjusted_ptr() {
    return HEAPU32[(this.ptr + 16) >> 2]
  }
  get_exception_ptr() {
    const isPointer = ___cxa_is_pointer_type(this.get_type())
    if (isPointer) {
      return HEAPU32[this.excPtr >> 2]
    }
    const adjusted = this.get_adjusted_ptr()
    if (adjusted !== 0) return adjusted
    return this.excPtr
  }
}
let exceptionLast = 0
let uncaughtExceptionCount = 0
const ___cxa_throw = (ptr, type, destructor) => {
  const info = new ExceptionInfo(ptr)
  info.init(type, destructor)
  exceptionLast = ptr
  uncaughtExceptionCount++
  throw exceptionLast
}
const __abort_js = () => {
  abort('')
}
const __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num)
const stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  if (!(maxBytesToWrite > 0)) return 0
  const startIdx = outIdx
  const endIdx = outIdx + maxBytesToWrite - 1
  for (let i = 0; i < str.length; ++i) {
    let u = str.charCodeAt(i)
    if (u >= 55_296 && u <= 57_343) {
      const u1 = str.charCodeAt(++i)
      u = (65_536 + ((u & 1023) << 10)) | (u1 & 1023)
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break
      heap[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break
      heap[outIdx++] = 192 | (u >> 6)
      heap[outIdx++] = 128 | (u & 63)
    } else if (u <= 65_535) {
      if (outIdx + 2 >= endIdx) break
      heap[outIdx++] = 224 | (u >> 12)
      heap[outIdx++] = 128 | ((u >> 6) & 63)
      heap[outIdx++] = 128 | (u & 63)
    } else {
      if (outIdx + 3 >= endIdx) break
      heap[outIdx++] = 240 | (u >> 18)
      heap[outIdx++] = 128 | ((u >> 12) & 63)
      heap[outIdx++] = 128 | ((u >> 6) & 63)
      heap[outIdx++] = 128 | (u & 63)
    }
  }
  heap[outIdx] = 0
  return outIdx - startIdx
}
const stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
const __tzset_js = (timezone, daylight, std_name, dst_name) => {
  const currentYear = new Date().getFullYear()
  const winter = new Date(currentYear, 0, 1)
  const summer = new Date(currentYear, 6, 1)
  const winterOffset = winter.getTimezoneOffset()
  const summerOffset = summer.getTimezoneOffset()
  const stdTimezoneOffset = Math.max(winterOffset, summerOffset)
  HEAPU32[timezone >> 2] = stdTimezoneOffset * 60
  HEAP32[daylight >> 2] = Number(winterOffset != summerOffset)
  const extractZone = timezoneOffset => {
    const sign = timezoneOffset >= 0 ? '-' : '+'
    const absOffset = Math.abs(timezoneOffset)
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const minutes = String(absOffset % 60).padStart(2, '0')
    return `UTC${sign}${hours}${minutes}`
  }
  const winterName = extractZone(winterOffset)
  const summerName = extractZone(summerOffset)
  if (summerOffset < winterOffset) {
    stringToUTF8(winterName, std_name, 17)
    stringToUTF8(summerName, dst_name, 17)
  } else {
    stringToUTF8(winterName, dst_name, 17)
    stringToUTF8(summerName, std_name, 17)
  }
}
const abortOnCannotGrowMemory = requestedSize => {
  abort('OOM')
}
const _emscripten_resize_heap = requestedSize => {
  const oldSize = HEAPU8.length
  requestedSize >>>= 0
  abortOnCannotGrowMemory(requestedSize)
}
const ENV = {}
const getExecutableName = () => thisProgram || './this.program'
const getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    const lang = ((typeof navigator === 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8'
    const env = { USER: 'web_user', LOGNAME: 'web_user', PATH: '/', PWD: '/', HOME: '/home/web_user', LANG: lang, _: getExecutableName() }
    for (var x in ENV) {
      if (ENV[x] === undefined) delete env[x]
      else env[x] = ENV[x]
    }
    const strings = []
    for (var x in env) {
      strings.push(`${x}=${env[x]}`)
    }
    getEnvStrings.strings = strings
  }
  return getEnvStrings.strings
}
const stringToAscii = (str, buffer) => {
  for (let i = 0; i < str.length; ++i) {
    HEAP8[buffer++] = str.charCodeAt(i)
  }
  HEAP8[buffer] = 0
}
const _environ_get = (__environ, environ_buf) => {
  let bufSize = 0
  for (const [i, string] of getEnvStrings().entries()) {
    const ptr = environ_buf + bufSize
    HEAPU32[(__environ + i * 4) >> 2] = ptr
    stringToAscii(string, ptr)
    bufSize += string.length + 1
  }
  return 0
}
const _environ_sizes_get = (penviron_count, penviron_buf_size) => {
  const strings = getEnvStrings()
  HEAPU32[penviron_count >> 2] = strings.length
  let bufSize = 0
  for (const string of strings) (bufSize += string.length + 1)
  HEAPU32[penviron_buf_size >> 2] = bufSize
  return 0
}
var wasmImports = {
  a: ___cxa_throw,
  b: __abort_js,
  g: __emscripten_memcpy_js,
  d: __tzset_js,
  c: _emscripten_resize_heap,
  e: _environ_get,
  f: _environ_sizes_get,
  h: js_getChunkAt,
}
var wasmExports = createWasm()
let ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports['j'])()
export let _createChunkHandle = (Module['_createChunkHandle'] = (a0, a1, a2, a3, a4) => (_createChunkHandle = Module['_createChunkHandle'] = wasmExports['l'])(a0, a1, a2, a3, a4))
export let _releaseChunkHandle = (Module['_releaseChunkHandle'] = a0 => (_releaseChunkHandle = Module['_releaseChunkHandle'] = wasmExports['m'])(a0))
export let _updateLightAt = (Module['_updateLightAt'] = (a0, a1, a2, a3) => (_updateLightAt = Module['_updateLightAt'] = wasmExports['n'])(a0, a1, a2, a3))
export let _getLightAt = (Module['_getLightAt'] = (a0, a1, a2, a3, a4) => (_getLightAt = Module['_getLightAt'] = wasmExports['o'])(a0, a1, a2, a3, a4))
var ___cxa_is_pointer_type = a0 => (___cxa_is_pointer_type = wasmExports['p'])(a0)
let calledRun
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run()
  if (!calledRun) dependenciesFulfilled = runCaller
}
function run() {
  if (runDependencies > 0) {
    return
  }
  preRun()
  if (runDependencies > 0) {
    return
  }
  function doRun() {
    if (calledRun) return
    calledRun = true
    Module['calledRun'] = true
    if (ABORT) return
    initRuntime()
    Module['onRuntimeInitialized']?.()
    postRun()
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...')
    setTimeout(() => {
      setTimeout(() => {
        Module['setStatus']('')
      }, 1)
      doRun()
    }, 1)
  } else {
    doRun()
  }
}
if (Module['preInit']) {
  if (typeof Module['preInit'] === 'function') Module['preInit'] = [Module['preInit']]
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()()
  }
}
run()
