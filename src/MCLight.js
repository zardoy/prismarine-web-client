/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = Module === undefined ? {} : Module

globalThis.getBlockStateAt = (...args) => {
  console.log('getBlockStateAt', args)
}
globalThis.getChunkHandleAt = (...args) => {
  console.log('getChunkHandleAt', args)
}

const wasmURL = new URL('MCLight.wasm', import.meta.url)

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
const ENVIRONMENT_IS_WEB = typeof window === 'object'
const ENVIRONMENT_IS_WORKER = typeof importScripts === 'function'
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
const ENVIRONMENT_IS_NODE = false
const ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER

if (Module['ENVIRONMENT']) {
  throw new Error('Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)')
}

if (ENVIRONMENT_IS_NODE) {
  // `require()` is no-op in an ESM module, use `createRequire()` to construct
  // the require()` function.  This is only necessary for multi-environment
  // builds, `-sENVIRONMENT=node` emits a static import declaration instead.
  // TODO: Swap all `require()`'s with `import()`'s?

}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
let moduleOverrides = { ...Module }

let arguments_ = []
let thisProgram = './this.program'
let quit_ = (status, toThrow) => {
  throw toThrow
}

// `/` should be present at the end if `scriptDirectory` is not empty
let scriptDirectory = ''
function locateFile (path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory)
  }
  return scriptDirectory + path
}

// Hooks that are implemented differently in different runtime environments.
let readAsync; let readBinary

if (ENVIRONMENT_IS_NODE) {
  if (!process?.release || process.release.name !== 'node') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)')

  const nodeVersion = process.versions.node
  let numericVersion = nodeVersion.split('.').slice(0, 3)
  numericVersion = (numericVersion[0] * 10_000) + (numericVersion[1] * 100) + (numericVersion[2].split('-')[0] * 1)
  const minVersion = 160_000
  if (numericVersion < 160_000) {
    throw new Error('This emscripten-generated code requires node v16.0.0 (detected v' + nodeVersion + ')')
  }

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  const fs = require('fs')
  const nodePath = require('path')

  scriptDirectory = __dirname + '/'

  // include: node_shell_read.js
  readBinary = (filename) => {
    // We need to re-wrap `file://` strings to URLs. Normalizing isn't
    // necessary in that case, the path should already be absolute.
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename)
    const ret = fs.readFileSync(filename)
    assert(ret.buffer)
    return ret
  }

  readAsync = async (filename, binary = true) => {
    // See the comment in the `readBinary` function.
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename)
    return new Promise((resolve, reject) => {
      fs.readFile(filename, binary ? undefined : 'utf8', (err, data) => {
        if (err) reject(err)
        else resolve(binary ? data.buffer : data)
      })
    })
  }
  // end include: node_shell_read.js
  if (!Module['thisProgram'] && process.argv.length > 1) {
    thisProgram = process.argv[1].replaceAll('\\', '/')
  }

  arguments_ = process.argv.slice(2)

  if (typeof module !== 'undefined') {
    module['exports'] = Module
  }

  process.on('uncaughtException', (ex) => {
    // suppress ExitStatus exceptions from showing an error
    if (ex !== 'unwind' && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
      throw ex
    }
  })

  quit_ = (status, toThrow) => {
    process.exitCode = status
    throw toThrow
  }

} else
  if (ENVIRONMENT_IS_SHELL) {

    if ((typeof process === 'object' && typeof require === 'function') || typeof window === 'object' || typeof importScripts === 'function') throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)')

  } else

    // Note that this includes Node.js workers when relevant (pthreads is enabled).
    // Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
    // ENVIRONMENT_IS_NODE.
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
        scriptDirectory = self.location.href
      } else if (typeof document !== 'undefined' && document.currentScript) { // web
        scriptDirectory = document.currentScript.src
      }
      // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
      // otherwise, slice off the final part of the url to find the script directory.
      // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
      // and scriptDirectory will correctly be replaced with an empty string.
      // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
      // they are removed because they could contain a slash.
      if (scriptDirectory.startsWith('blob:')) {
        scriptDirectory = ''
      } else {
        scriptDirectory = scriptDirectory.slice(0, Math.max(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1))
      }

      if (!(typeof window === 'object' || typeof importScripts === 'function')) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)')

      {
        // include: web_or_worker_shell_read.js
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url, false)
            xhr.responseType = 'arraybuffer'
            xhr.send(null)
            return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response))
          }
        }

        readAsync = async (url) => {
          // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
          // See https://github.com/github/fetch/pull/92#issuecomment-140665932
          // Cordova or Electron apps are typically loaded from a file:// url.
          // So use XHR on webview if URL is a file URL.
          if (isFileURI(url)) {
            return new Promise((reject, resolve) => {
              const xhr = new XMLHttpRequest()
              xhr.open('GET', url, true)
              xhr.responseType = 'arraybuffer'
              xhr.onload = () => {
                if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
                  resolve(xhr.response)
                }
                reject(xhr.status)
              }
              xhr.onerror = reject
              xhr.send(null)
            })
          }
          return fetch(wasmURL, { credentials: 'same-origin' })
            .then(async (response) => {
              if (response.ok) {
                return response.arrayBuffer()
              }
              throw new Error(response.status + ' : ' + response.url)
            })
        }
        // end include: web_or_worker_shell_read.js
      }
    } else {
      throw new Error('environment detection error')
    }

let out = Module['print'] || console.log.bind(console)
let err = Module['printErr'] || console.error.bind(console)

// Merge back in the overrides
Object.assign(Module, moduleOverrides)
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null
checkIncomingModuleAPI()

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.

if (Module['arguments']) arguments_ = Module['arguments']; legacyModuleProp('arguments', 'arguments_')

if (Module['thisProgram']) thisProgram = Module['thisProgram']; legacyModuleProp('thisProgram', 'thisProgram')

if (Module['quit']) quit_ = Module['quit']; legacyModuleProp('quit', 'quit_')

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// Assertions on removed incoming Module JS APIs.
assert(Module['memoryInitializerPrefixURL'] === undefined, 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead')
assert(Module['pthreadMainPrefixURL'] === undefined, 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead')
assert(Module['cdInitializerPrefixURL'] === undefined, 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead')
assert(Module['filePackagePrefixURL'] === undefined, 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead')
assert(Module['read'] === undefined, 'Module.read option was removed')
assert(Module['readAsync'] === undefined, 'Module.readAsync option was removed (modify readAsync in JS)')
assert(Module['readBinary'] === undefined, 'Module.readBinary option was removed (modify readBinary in JS)')
assert(Module['setWindowTitle'] === undefined, 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)')
assert(Module['TOTAL_MEMORY'] === undefined, 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY')
legacyModuleProp('asm', 'wasmExports')
legacyModuleProp('readAsync', 'readAsync')
legacyModuleProp('readBinary', 'readBinary')
legacyModuleProp('setWindowTitle', 'setWindowTitle')
const IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js'
const PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js'
const WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js'
const FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js'
const ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js'
const JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js'
const OPFS = 'OPFS is no longer included by default; build with -lopfs.js'

const NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js'

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.')

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

let wasmBinary
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary']; legacyModuleProp('wasmBinary', 'wasmBinary')

if (typeof WebAssembly !== 'object') {
  err('no native wasm support detected')
}

// Wasm globals

let wasmMemory

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
let ABORT = false

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
let EXITSTATUS

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert (condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''))
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
function _malloc () {
  abort('malloc() called but not included in the build - add `_malloc` to EXPORTED_FUNCTIONS')
}
function _free () {
  // Show a helpful error since we used to include free by default in the past.
  abort('free() called but not included in the build - add `_free` to EXPORTED_FUNCTIONS')
}

// Memory management

let HEAP
/** @type {!Int8Array} */
let HEAP8
/** @type {!Uint8Array} */
let HEAPU8
/** @type {!Int16Array} */
let HEAP16
/** @type {!Uint16Array} */
let HEAPU16
/** @type {!Int32Array} */
let HEAP32
/** @type {!Uint32Array} */
let HEAPU32
/** @type {!Float32Array} */
let HEAPF32
/** @type {!Float64Array} */
let HEAPF64

// include: runtime_shared.js
function updateMemoryViews () {
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
// end include: runtime_shared.js
assert(!Module['STACK_SIZE'], 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')

assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
  'JS engine does not provide full typed array support')

// If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
assert(!Module['wasmMemory'], 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally')
assert(!Module['INITIAL_MEMORY'], 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically')

// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie () {
  let max = _emscripten_stack_get_end()
  assert((max & 3) == 0)
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max) >> 2)] = 0x02_13_54_67
  HEAPU32[(((max) + (4)) >> 2)] = 0x89_BA_CD_FE
  // Also test the global address 0 for integrity.
  HEAPU32[((0) >> 2)] = 1_668_509_029
}

function checkStackCookie () {
  if (ABORT) return
  let max = _emscripten_stack_get_end()
  // See writeStackCookie().
  if (max == 0) {
    max += 4
  }
  const cookie1 = HEAPU32[((max) >> 2)]
  const cookie2 = HEAPU32[(((max) + (4)) >> 2)]
  if (cookie1 != 0x02_13_54_67 || cookie2 != 0x89_BA_CD_FE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`)
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0) >> 2)] != 0x63_73_6d_65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!')
  }
}
// end include: runtime_stack_check.js
// include: runtime_assertions.js
// Endianness check
(function () {
  const h16 = new Int16Array(1)
  const h8 = new Int8Array(h16.buffer)
  h16[0] = 0x63_73
  if (h8[0] !== 0x73 || h8[1] !== 0x63) throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)'
})()

// end include: runtime_assertions.js
const __ATPRERUN__ = [] // functions called before the runtime is initialized
const __ATINIT__ = [] // functions called during startup
const __ATMAIN__ = [] // functions called when main() is to be run
const __ATEXIT__ = [] // functions called during shutdown
const __ATPOSTRUN__ = [] // functions called after the main() is called

let runtimeInitialized = false

function preRun () {
  if (Module['preRun']) {
    if (typeof Module['preRun'] === 'function') Module['preRun'] = [Module['preRun']]
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift())
    }
  }
  callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime () {
  assert(!runtimeInitialized)
  runtimeInitialized = true

  checkStackCookie()


  callRuntimeCallbacks(__ATINIT__)
}

function preMain () {
  checkStackCookie()

  callRuntimeCallbacks(__ATMAIN__)
}

function postRun () {
  checkStackCookie()

  if (Module['postRun']) {
    if (typeof Module['postRun'] === 'function') Module['postRun'] = [Module['postRun']]
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift())
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun (cb) {
  __ATPRERUN__.unshift(cb)
}

function addOnInit (cb) {
  __ATINIT__.unshift(cb)
}

function addOnPreMain (cb) {
  __ATMAIN__.unshift(cb)
}

function addOnExit (cb) {
}

function addOnPostRun (cb) {
  __ATPOSTRUN__.unshift(cb)
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc

assert(Math.imul, 'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill')
assert(Math.fround, 'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill')
assert(Math.clz32, 'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill')
assert(Math.trunc, 'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill')
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
let runDependencies = 0
let runDependencyWatcher = null
let dependenciesFulfilled = null // overridden to take different actions when all run dependencies are fulfilled
const runDependencyTracking = {}

function getUniqueRunDependency (id) {
  const orig = id
  while (1) {
    if (!runDependencyTracking[id]) return id
    id = orig + Math.random()
  }
}

function addRunDependency (id) {
  runDependencies++

  Module['monitorRunDependencies']?.(runDependencies)

  if (id) {
    assert(!runDependencyTracking[id])
    runDependencyTracking[id] = 1
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(() => {
        if (ABORT) {
          clearInterval(runDependencyWatcher)
          runDependencyWatcher = null
          return
        }
        let shown = false
        for (const dep in runDependencyTracking) {
          if (!shown) {
            shown = true
            err('still waiting on run dependencies:')
          }
          err(`dependency: ${dep}`)
        }
        if (shown) {
          err('(end of list)')
        }
      }, 10_000)
    }
  } else {
    err('warning: run dependency added without ID')
  }
}

function removeRunDependency (id) {
  runDependencies--

  Module['monitorRunDependencies']?.(runDependencies)

  if (id) {
    assert(runDependencyTracking[id])
    delete runDependencyTracking[id]
  } else {
    err('warning: run dependency removed without ID')
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher)
      runDependencyWatcher = null
    }
    if (dependenciesFulfilled) {
      const callback = dependenciesFulfilled
      dependenciesFulfilled = null
      callback() // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort (what) {
  Module['onAbort']?.(what)

  what = 'Aborted(' + what + ')'
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what)

  ABORT = true
  EXITSTATUS = 1

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  const e = new WebAssembly.RuntimeError(what)

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// show errors on likely calls to FS when it was not included
var FS = {
  error () {
    abort('Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM')
  },
  init () { FS.error() },
  createDataFile () { FS.error() },
  createPreloadedFile () { FS.error() },
  createLazyFile () { FS.error() },
  open () { FS.error() },
  mkdev () { FS.error() },
  registerDevice () { FS.error() },
  analyzePath () { FS.error() },

  ErrnoError () { FS.error() },
}
Module['FS_createDataFile'] = FS.createDataFile
Module['FS_createPreloadedFile'] = FS.createPreloadedFile

// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
const dataURIPrefix = 'data:application/octet-stream;base64,'

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */
const isDataURI = (filename) => filename.startsWith(dataURIPrefix)

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://')
// end include: URIUtils.js
function createExportWrapper (name, nargs) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`)
    const f = wasmExports[name]
    assert(f, `exported native function \`${name}\` not found`)
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`)
    return f(...args)
  }
}

// include: runtime_exceptions.js
// end include: runtime_exceptions.js
function findWasmBinary () {
  const f = 'MCLight.wasm'
  if (!isDataURI(f)) {
    return locateFile(f)
  }
  return f
}

let wasmBinaryFile = wasmURL.toString()

function getBinarySync (file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary)
  }
  if (readBinary) {
    return readBinary(file)
  }
  throw 'both async and sync fetching of the wasm failed'
}

function getBinaryPromise (binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary
  ) {
    // Fetch the binary using readAsync
    return readAsync(binaryFile).then(
      (response) => new Uint8Array(/** @type{!ArrayBuffer} */(response)),
      // Fall back to getBinarySync if readAsync fails
      () => getBinarySync(binaryFile)
    )
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile))
}

function instantiateArrayBuffer (binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then(async (binary) => {
    return WebAssembly.instantiate(binary, imports)
  }).then(receiver, (reason) => {
    err(`failed to asynchronously prepare wasm: ${reason}`)

    // Warn on some common problems.
    if (isFileURI(wasmBinaryFile)) {
      err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`)
    }
    abort(reason)
  })
}

function instantiateAsync (binary, binaryFile, imports, callback) {
  if (!binary &&
    typeof WebAssembly.instantiateStreaming === 'function' &&
    !isDataURI(binaryFile) &&
    // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
    !isFileURI(binaryFile) &&
    // Avoid instantiateStreaming() on Node.js environment for now, as while
    // Node.js v18.1.0 implements it, it does not have a full fetch()
    // implementation yet.
    //
    // Reference:
    //   https://github.com/emscripten-core/emscripten/pull/16917
    !ENVIRONMENT_IS_NODE &&
    typeof fetch === 'function') {
    return fetch(binaryFile, { credentials: 'same-origin' }).then(async (response) => {
      // Suppress closure warning here since the upstream definition for
      // instantiateStreaming only allows Promise<Repsponse> rather than
      // an actual Response.
      // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
      /** @suppress {checkTypes} */
      const result = WebAssembly.instantiateStreaming(response, imports)

      return result.then(
        callback,
        (reason) => {
          // We expect the most common failure cause to be a bad MIME type for the binary,
          // in which case falling back to ArrayBuffer instantiation should work.
          err(`wasm streaming compile failed: ${reason}`)
          err('falling back to ArrayBuffer instantiation')
          return instantiateArrayBuffer(binaryFile, imports, callback)
        }
      )
    })
  }
  return instantiateArrayBuffer(binaryFile, imports, callback)
}

function getWasmImports () {
  // prepare imports
  return {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  }
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm () {
  const info = getWasmImports()
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance (instance, module) {
    wasmExports = instance.exports



    wasmMemory = wasmExports['memory']

    assert(wasmMemory, 'memory not found in wasm exports')
    updateMemoryViews()

    addOnInit(wasmExports['__wasm_call_ctors'])

    removeRunDependency('wasm-instantiate')
    return wasmExports
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate')

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  let trueModule = Module
  function receiveInstantiationResult (result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?')
    trueModule = null
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    receiveInstance(result['instance'])
  }

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    try {
      return Module['instantiateWasm'](info, receiveInstance)
    } catch (e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`)
      return false
    }
  }

  if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary()

  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult)
  return {} // no exports yet; we'll fill them in later
}

// Globals used by JS i64 conversions (see makeSetValue)
let tempDouble
let tempI64

// include: runtime_debug.js
function legacyModuleProp (prop, newName, incoming = true) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      get () {
        const extra = incoming ? ' (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)' : ''
        abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra)

      }
    })
  }
}

function ignoredModuleProp (prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`)
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem (name) {
  return name === 'FS_createPath' ||
    name === 'FS_createDataFile' ||
    name === 'FS_createPreloadedFile' ||
    name === 'FS_unlink' ||
    name === 'addRunDependency' ||
    // The old FS has some functionality that WasmFS lacks.
    name === 'FS_createLazyFile' ||
    name === 'FS_createDevice' ||
    name === 'removeRunDependency'
}

function missingGlobal (sym, msg) {
  if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get () {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`)
        return undefined
      }
    })
  }
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer')
missingGlobal('asm', 'Please use wasmExports instead')

function missingLibrarySymbol (sym) {
  if (typeof globalThis !== 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get () {
        // Can't `abort()` here because it would break code that does runtime
        // checks.  e.g. `if (typeof SDL === 'undefined')`.
        let msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`
        // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
        // library.js, which means $name for a JS name with no prefix, or name
        // for a JS name like _name.
        let librarySymbol = sym
        if (!librarySymbol.startsWith('_')) {
          librarySymbol = '$' + sym
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you'
        }
        warnOnce(msg)
        return undefined
      }
    })
  }
  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym)
}

function unexportedRuntimeSymbol (sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get () {
        let msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you'
        }
        abort(msg)
      }
    })
  }
}

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg (...args) {
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args)
}
// end include: runtime_debug.js
// === Body ===

function console_log_int (x) {  }

// end include: preamble.js


/** @constructor */
function ExitStatus (status) {
  this.name = 'ExitStatus'
  this.message = `Program terminated with exit(${status})`
  this.status = status
}

var callRuntimeCallbacks = (callbacks) => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module)
  }
}


/**
     * @param {number} ptr
     * @param {string} type
     */
function getValue (ptr, type = 'i8') {
  if (type.endsWith('*')) type = '*'
  switch (type) {
    case 'i1': return HEAP8[ptr]
    case 'i8': return HEAP8[ptr]
    case 'i16': return HEAP16[((ptr) >> 1)]
    case 'i32': return HEAP32[((ptr) >> 2)]
    case 'i64': abort('to do getValue(i64) use WASM_BIGINT')
    case 'float': return HEAPF32[((ptr) >> 2)]
    case 'double': return HEAPF64[((ptr) >> 3)]
    case '*': return HEAPU32[((ptr) >> 2)]
    default: abort(`invalid type for getValue: ${type}`)
  }
}

const noExitRuntime = Module['noExitRuntime'] || true

var ptrToString = (ptr) => {
  assert(typeof ptr === 'number')
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  ptr >>>= 0
  return '0x' + ptr.toString(16).padStart(8, '0')
}


/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
function setValue (ptr, value, type = 'i8') {
  if (type.endsWith('*')) type = '*'
  switch (type) {
    case 'i1': HEAP8[ptr] = value; break
    case 'i8': HEAP8[ptr] = value; break
    case 'i16': HEAP16[((ptr) >> 1)] = value; break
    case 'i32': HEAP32[((ptr) >> 2)] = value; break
    case 'i64': abort('to do setValue(i64) use WASM_BIGINT')
    case 'float': HEAPF32[((ptr) >> 2)] = value; break
    case 'double': HEAPF64[((ptr) >> 3)] = value; break
    case '*': HEAPU32[((ptr) >> 2)] = value; break
    default: abort(`invalid type for setValue: ${type}`)
  }
}

const stackRestore = (val) => __emscripten_stack_restore(val)

const stackSave = () => _emscripten_stack_get_current()

var warnOnce = (text) => {
  warnOnce.shown ||= {}
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1
    if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text
    err(text)
  }
}

const UTF8Decoder = typeof TextDecoder === 'undefined' ? undefined : new TextDecoder()

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
const UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
  const endIdx = idx + maxBytesToRead
  let endPtr = idx
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.  Also, use the length info to avoid running tiny
  // strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation,
  // so that undefined means Infinity)
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr

  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
  }
  let str = ''
  // If building with TextDecoder, we have already computed the string length
  // above, so test loop end condition against that
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    let u0 = heapOrArray[idx++]
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue }
    const u1 = heapOrArray[idx++] & 63
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue }
    const u2 = heapOrArray[idx++] & 63
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2
    } else {
      if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!')
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63)
    }

    if (u0 < 0x1_00_00) {
      str += String.fromCharCode(u0)
    } else {
      const ch = u0 - 0x1_00_00
      str += String.fromCharCode(0xD8_00 | (ch >> 10), 0xDC_00 | (ch & 0x3_FF))
    }
  }
  return str
}

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
const UTF8ToString = (ptr, maxBytesToRead) => {
  assert(typeof ptr === 'number', `UTF8ToString expects a number (got ${typeof ptr})`)
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ''
}
const ___assert_fail = (condition, filename, line, func) => {
  abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function'])
}

class ExceptionInfo {
  // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
  constructor(excPtr) {
    this.excPtr = excPtr
    this.ptr = excPtr - 24
  }

  set_type (type) {
    HEAPU32[(((this.ptr) + (4)) >> 2)] = type
  }

  get_type () {
    return HEAPU32[(((this.ptr) + (4)) >> 2)]
  }

  set_destructor (destructor) {
    HEAPU32[(((this.ptr) + (8)) >> 2)] = destructor
  }

  get_destructor () {
    return HEAPU32[(((this.ptr) + (8)) >> 2)]
  }

  set_caught (caught) {
    caught = caught ? 1 : 0
    HEAP8[(this.ptr) + (12)] = caught
  }

  get_caught () {
    return HEAP8[(this.ptr) + (12)] != 0
  }

  set_rethrown (rethrown) {
    rethrown = rethrown ? 1 : 0
    HEAP8[(this.ptr) + (13)] = rethrown
  }

  get_rethrown () {
    return HEAP8[(this.ptr) + (13)] != 0
  }

  // Initialize native structure fields. Should be called once after allocated.
  init (type, destructor) {
    this.set_adjusted_ptr(0)
    this.set_type(type)
    this.set_destructor(destructor)
  }

  set_adjusted_ptr (adjustedPtr) {
    HEAPU32[(((this.ptr) + (16)) >> 2)] = adjustedPtr
  }

  get_adjusted_ptr () {
    return HEAPU32[(((this.ptr) + (16)) >> 2)]
  }

  // Get pointer which is expected to be received by catch clause in C++ code. It may be adjusted
  // when the pointer is casted to some of the exception object base classes (e.g. when virtual
  // inheritance is used). When a pointer is thrown this method should return the thrown pointer
  // itself.
  get_exception_ptr () {
    // Work around a fastcomp bug, this code is still included for some reason in a build without
    // exceptions support.
    const isPointer = ___cxa_is_pointer_type(this.get_type())
    if (isPointer) {
      return HEAPU32[((this.excPtr) >> 2)]
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
  // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
  info.init(type, destructor)
  exceptionLast = ptr
  uncaughtExceptionCount++
  assert(false, 'Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.')
}

const __abort_js = () => {
  abort('native code called abort()')
}

const __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num)

const stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`)
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) { return 0 }

  const startIdx = outIdx
  const endIdx = outIdx + maxBytesToWrite - 1 // -1 for string null terminator.
  for (let i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    let u = str.charCodeAt(i) // possibly a lead surrogate
    if (u >= 0xD8_00 && u <= 0xDF_FF) {
      const u1 = str.charCodeAt(++i)
      u = 0x1_00_00 + ((u & 0x3_FF) << 10) | (u1 & 0x3_FF)
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break
      heap[outIdx++] = u
    } else if (u <= 0x7_FF) {
      if (outIdx + 1 >= endIdx) break
      heap[outIdx++] = 0xC0 | (u >> 6)
      heap[outIdx++] = 0x80 | (u & 63)
    } else if (u <= 0xFF_FF) {
      if (outIdx + 2 >= endIdx) break
      heap[outIdx++] = 0xE0 | (u >> 12)
      heap[outIdx++] = 0x80 | ((u >> 6) & 63)
      heap[outIdx++] = 0x80 | (u & 63)
    } else {
      if (outIdx + 3 >= endIdx) break
      if (u > 0x10_FF_FF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).')
      heap[outIdx++] = 0xF0 | (u >> 18)
      heap[outIdx++] = 0x80 | ((u >> 12) & 63)
      heap[outIdx++] = 0x80 | ((u >> 6) & 63)
      heap[outIdx++] = 0x80 | (u & 63)
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0
  return outIdx - startIdx
}
const stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
  assert(typeof maxBytesToWrite === 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!')
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

const lengthBytesUTF8 = (str) => {
  let len = 0
  for (let i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    const c = str.charCodeAt(i) // possibly a lead surrogate
    if (c <= 0x7F) {
      len++
    } else if (c <= 0x7_FF) {
      len += 2
    } else if (c >= 0xD8_00 && c <= 0xDF_FF) {
      len += 4; ++i
    } else {
      len += 3
    }
  }
  return len
}
const __tzset_js = (timezone, daylight, std_name, dst_name) => {
  // TODO: Use (malleable) environment variables instead of system settings.
  const currentYear = new Date().getFullYear()
  const winter = new Date(currentYear, 0, 1)
  const summer = new Date(currentYear, 6, 1)
  const winterOffset = winter.getTimezoneOffset()
  const summerOffset = summer.getTimezoneOffset()

  // Local standard timezone offset. Local standard time is not adjusted for
  // daylight savings.  This code uses the fact that getTimezoneOffset returns
  // a greater value during Standard Time versus Daylight Saving Time (DST).
  // Thus it determines the expected output during Standard Time, and it
  // compares whether the output of the given date the same (Standard) or less
  // (DST).
  const stdTimezoneOffset = Math.max(winterOffset, summerOffset)

  // timezone is specified as seconds west of UTC ("The external variable
  // `timezone` shall be set to the difference, in seconds, between
  // Coordinated Universal Time (UTC) and local standard time."), the same
  // as returned by stdTimezoneOffset.
  // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
  HEAPU32[((timezone) >> 2)] = stdTimezoneOffset * 60

  HEAP32[((daylight) >> 2)] = Number(winterOffset != summerOffset)

  const extractZone = (timezoneOffset) => {
    // Why inverse sign?
    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
    const sign = timezoneOffset >= 0 ? '-' : '+'

    const absOffset = Math.abs(timezoneOffset)
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const minutes = String(absOffset % 60).padStart(2, '0')

    return `UTC${sign}${hours}${minutes}`
  }

  const winterName = extractZone(winterOffset)
  const summerName = extractZone(summerOffset)
  assert(winterName)
  assert(summerName)
  assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`)
  assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`)
  if (summerOffset < winterOffset) {
    // Northern hemisphere
    stringToUTF8(winterName, std_name, 17)
    stringToUTF8(summerName, dst_name, 17)
  } else {
    stringToUTF8(winterName, dst_name, 17)
    stringToUTF8(summerName, std_name, 17)
  }
}

const getHeapMax = () => HEAPU8.length

const abortOnCannotGrowMemory = (requestedSize) => {
  abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`)
}
const _emscripten_resize_heap = (requestedSize) => {
  const oldSize = HEAPU8.length
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0
  abortOnCannotGrowMemory(requestedSize)
}

const ENV = {
}

const getExecutableName = () => {
  return thisProgram || './this.program'
}
const getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    // Default values.
    // Browser language detection #8751
    const lang = ((typeof navigator === 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') + '.UTF-8'
    const env = {
      'USER': 'web_user',
      'LOGNAME': 'web_user',
      'PATH': '/',
      'PWD': '/',
      'HOME': '/home/web_user',
      'LANG': lang,
      '_': getExecutableName()
    }
    // Apply the user-provided values, if any.
    for (var x in ENV) {
      // x is a key in ENV; if ENV[x] is undefined, that means it was
      // explicitly set to be so. We allow user code to do that to
      // force variables with default values to remain unset.
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
    assert(str.charCodeAt(i) === (str.charCodeAt(i) & 0xff))
    HEAP8[buffer++] = str.charCodeAt(i)
  }
  // Null-terminate the string
  HEAP8[buffer] = 0
}
const _environ_get = (__environ, environ_buf) => {
  let bufSize = 0
  for (const [i, string] of getEnvStrings().entries()) {
    const ptr = environ_buf + bufSize
    HEAPU32[(((__environ) + (i * 4)) >> 2)] = ptr
    stringToAscii(string, ptr)
    bufSize += string.length + 1
  }
  return 0
}

const _environ_sizes_get = (penviron_count, penviron_buf_size) => {
  const strings = getEnvStrings()
  HEAPU32[((penviron_count) >> 2)] = strings.length
  let bufSize = 0
  for (const string of strings) bufSize += string.length + 1
  HEAPU32[((penviron_buf_size) >> 2)] = bufSize
  return 0
}

const SYSCALLS = {
  varargs: undefined,
  getStr (ptr) {
    const ret = UTF8ToString(ptr)
    return ret
  },
}
const _fd_close = (fd) => {
  abort('fd_close called without SYSCALLS_REQUIRE_FILESYSTEM')
}

const convertI32PairToI53Checked = (lo, hi) => {
  assert(lo == (lo >>> 0) || lo == (lo | 0)) // lo should either be a i32 or a u32
  assert(hi === (hi | 0)) // hi should be a i32
  return ((hi + 0x20_00_00) >>> 0 < 0x40_00_01 - !!lo) ? (lo >>> 0) + hi * 4_294_967_296 : NaN
}
function _fd_seek (fd, offset_low, offset_high, whence, newOffset) {
  const offset = convertI32PairToI53Checked(offset_low, offset_high)


  return 70

}

const printCharBuffers = [null, [], []]

const printChar = (stream, curr) => {
  const buffer = printCharBuffers[stream]
  assert(buffer)
  if (curr === 0 || curr === 10) {
    (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0))
    buffer.length = 0
  } else {
    buffer.push(curr)
  }
}

const flush_NO_FILESYSTEM = () => {
  // flush anything remaining in the buffers during shutdown
  _fflush(0)
  if (printCharBuffers[1].length) printChar(1, 10)
  if (printCharBuffers[2].length) printChar(2, 10)
}


const _fd_write = (fd, iov, iovcnt, pnum) => {
  // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
  let num = 0
  for (let i = 0; i < iovcnt; i++) {
    const ptr = HEAPU32[((iov) >> 2)]
    const len = HEAPU32[(((iov) + (4)) >> 2)]
    iov += 8
    for (let j = 0; j < len; j++) {
      printChar(fd, HEAPU8[ptr + j])
    }
    num += len
  }
  HEAPU32[((pnum) >> 2)] = num
  return 0
}


const runtimeKeepaliveCounter = 0
const keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0
const _proc_exit = (code) => {
  EXITSTATUS = code
  if (!keepRuntimeAlive()) {
    Module['onExit']?.(code)
    ABORT = true
  }
  quit_(code, new ExitStatus(code))
}

/** @param {boolean|number=} implicit */
const exitJS = (status, implicit) => {
  EXITSTATUS = status

  checkUnflushedContent()

  // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
  if (keepRuntimeAlive() && !implicit) {
    const msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`
    err(msg)
  }

  _proc_exit(status)
}

const handleException = (e) => {
  // Certain exception types we do not treat as errors since they are used for
  // internal control flow.
  // 1. ExitStatus, which is thrown by exit()
  // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
  //    that wish to return to JS event loop.
  if (e instanceof ExitStatus || e == 'unwind') {
    return EXITSTATUS
  }
  checkStackCookie()
  if (e instanceof WebAssembly.RuntimeError) {
    if (_emscripten_stack_get_current() <= 0) {
      err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)')
    }
  }
  quit_(1, e)
}
function checkIncomingModuleAPI () {
  ignoredModuleProp('fetchSettings')
}
var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  __cxa_throw: ___cxa_throw,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _emscripten_memcpy_js: __emscripten_memcpy_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  console_log_int,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write
}
var wasmExports = createWasm()
const ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors', 0)
export const _createChunkHandle = Module['_createChunkHandle'] = createExportWrapper('createChunkHandle', 5)
export const _updateLightAt = Module['_updateLightAt'] = createExportWrapper('updateLightAt', 4)
export const _getLightAt = Module['_getLightAt'] = createExportWrapper('getLightAt', 5)
const _main = Module['_main'] = createExportWrapper('main', 2)
var _fflush = createExportWrapper('fflush', 1)
const _strerror = createExportWrapper('strerror', 1)
const __emscripten_tempret_set = createExportWrapper('_emscripten_tempret_set', 1)
let _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports['emscripten_stack_init'])()
let _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'])()
let _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'])()
var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'])()
var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports['_emscripten_stack_restore'])(a0)
let __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'])(a0)
var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'])()
var ___cxa_is_pointer_type = createExportWrapper('__cxa_is_pointer_type', 1)
const dynCall_ji = Module['dynCall_ji'] = createExportWrapper('dynCall_ji', 2)
const dynCall_vij = Module['dynCall_vij'] = createExportWrapper('dynCall_vij', 4)
const dynCall_jii = Module['dynCall_jii'] = createExportWrapper('dynCall_jii', 3)
const dynCall_jiji = Module['dynCall_jiji'] = createExportWrapper('dynCall_jiji', 5)
const dynCall_iiiiij = Module['dynCall_iiiiij'] = createExportWrapper('dynCall_iiiiij', 7)
const dynCall_iiiiijj = Module['dynCall_iiiiijj'] = createExportWrapper('dynCall_iiiiijj', 9)
const dynCall_iiiiiijj = Module['dynCall_iiiiiijj'] = createExportWrapper('dynCall_iiiiiijj', 10)


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

const missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertU32PairToI53',
  'stackAlloc',
  'getTempRet0',
  'setTempRet0',
  'zeroMemory',
  'growMemory',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'strError',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'initRandomFill',
  'randomFill',
  'emscriptenLog',
  'readEmAsmArgs',
  'jstoi_q',
  'listenOnce',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asmjsMangle',
  'asyncLoad',
  'alignMemory',
  'mmapAlloc',
  'HandleAllocator',
  'getNativeTypeSize',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'getCFunc',
  'ccall',
  'cwrap',
  'uleb128Encode',
  'sigToWasmTypes',
  'generateFuncType',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'reallyNegative',
  'unSign',
  'strLen',
  'reSign',
  'formatString',
  'intArrayFromString',
  'intArrayToString',
  'AsciiToString',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'battery',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'checkWasiClock',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'createDyncallWrapper',
  'safeSetTimeout',
  'setImmediateWrapped',
  'clearImmediateWrapped',
  'polyfillSetImmediate',
  'getPromise',
  'makePromise',
  'idsToPromises',
  'makePromiseCallback',
  'findMatchingCatch',
  'Browser_asyncPrepareDataCounter',
  'setMainLoop',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_stdin_getChar',
  'FS_unlink',
  'FS_createDataFile',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'setErrNo',
  'demangle',
  'stackTrace',
]
missingLibrarySymbols.forEach(missingLibrarySymbol)

const unexportedSymbols = [
  'run',
  'addOnPreRun',
  'addOnInit',
  'addOnPreMain',
  'addOnExit',
  'addOnPostRun',
  'addRunDependency',
  'removeRunDependency',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmMemory',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'convertI32PairToI53Checked',
  'stackSave',
  'stackRestore',
  'ptrToString',
  'exitJS',
  'getHeapMax',
  'abortOnCannotGrowMemory',
  'ENV',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'ERRNO_CODES',
  'DNS',
  'Protocols',
  'Sockets',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'jstoi_s',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'wasmTable',
  'noExitRuntime',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'stringToAscii',
  'UTF16Decoder',
  'JSEvents',
  'specialHTMLTargets',
  'findCanvasEventTarget',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'flush_NO_FILESYSTEM',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionLast',
  'exceptionCaught',
  'ExceptionInfo',
  'Browser',
  'getPreloadedImageData__data',
  'wget',
  'SYSCALLS',
  'preloadPlugins',
  'FS_stdin_getChar_buffer',
  'FS_createPath',
  'FS_createDevice',
  'FS_readFile',
  'FS',
  'FS_createLazyFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'print',
  'printErr',
]
unexportedSymbols.forEach(unexportedRuntimeSymbol)



let calledRun

dependenciesFulfilled = function runCaller () {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run()
  if (!calledRun) dependenciesFulfilled = runCaller // try this again later, after new deps are fulfilled
}

function callMain () {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])')
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called')

  const entryFunction = _main

  const argc = 0
  const argv = 0

  try {

    const ret = entryFunction(argc, argv)

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true)
    return ret
  } catch (e) {
    return handleException(e)
  }
}

function stackCheckInit () {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init()
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie()
}

function run () {

  if (runDependencies > 0) {
    return
  }

  stackCheckInit()

  preRun()

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return
  }

  function doRun () {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return
    calledRun = true
    Module['calledRun'] = true

    if (ABORT) return

    initRuntime()

    preMain()

    Module['onRuntimeInitialized']?.()

    if (shouldRunNow) callMain()

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
  checkStackCookie()
}

function checkUnflushedContent () {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  const oldOut = out
  const oldErr = err
  let has = false
  out = err = (x) => {
    has = true
  }
  try { // it doesn't matter if it fails
    flush_NO_FILESYSTEM()
  } catch (e) { }
  out = oldOut
  err = oldErr
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.')
    warnOnce('(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)')
  }
}

if (Module['preInit']) {
  if (typeof Module['preInit'] === 'function') Module['preInit'] = [Module['preInit']]
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()()
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true

if (Module['noInitialRun']) shouldRunNow = false

run()

// end include: postamble.js
