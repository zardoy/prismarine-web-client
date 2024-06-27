import { Vec3 } from 'vec3'
import { downloadAndOpenFileFromUrl } from './downloadAndOpenFile'
import { activeModalStack, miscUiState } from './globalState'
import { options } from './optionsStorage'
import { BenchmarkAdapter } from './benchmarkAdapter'

const testWorldFixtureUrl = 'https://bucket.mcraft.fun/Future CITY 4.4-slim.zip'
const testWorldFixtureSpawn = [-133, 87, 309] as const

export const openBenchmark = async (renderDistance = 8) => {
  let memoryUsageAverage = 0
  let memoryUsageSamples = 0
  let memoryUsageWorst = 0
  setInterval(() => {
    const memoryUsage = (window.performance as any)?.memory?.usedJSHeapSize
    if (memoryUsage) {
      memoryUsageAverage = (memoryUsageAverage * memoryUsageSamples + memoryUsage) / (memoryUsageSamples + 1)
      memoryUsageSamples++
      if (memoryUsage > memoryUsageWorst) {
        memoryUsageWorst = memoryUsage
      }
    }
  }, 200)

  const benchmarkAdapter: BenchmarkAdapter = {
    get worldLoadTime () {
      return window.worldLoadTime
    },
    get averageRenderTime () {
      return window.viewer.world.avgRenderTime
    },
    get worstRenderTime () {
      return window.viewer.world.worstRenderTime
    },
    get memoryUsageAverage () {
      return memoryUsageAverage
    },
    get memoryUsageWorst () {
      return memoryUsageWorst
    }
  }
  window.benchmarkAdapter = benchmarkAdapter

  options.renderDistance = renderDistance
  void downloadAndOpenFileFromUrl(testWorldFixtureUrl, undefined, {
    connectEvents: {
      serverCreated () {
        if (testWorldFixtureSpawn) {
          localServer!.spawnPoint = new Vec3(...testWorldFixtureSpawn)
          localServer!.on('newPlayer', (player) => {
            player.on('dataLoaded', () => {
              player.position = new Vec3(...testWorldFixtureSpawn)
            })
          })
        }
      },
    }
  })
}

export const registerOpenBenchmarkListener = () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('openBenchmark')) {
    void openBenchmark(params.has('renderDistance') ? +params.get('renderDistance')! : undefined)
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && e.shiftKey && !miscUiState.gameLoaded && activeModalStack.length === 0) {
      e.preventDefault()
      void openBenchmark()
    }
  })
}
