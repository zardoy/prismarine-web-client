import { Vec3 } from 'vec3'
import { addBlocksSection, addWebgpuListener, webgpuChannel } from '../../examples/webgpuRendererMain'
import type { WebglData } from '../prepare/webglData'
import { loadJSON } from './utils.web'
import { WorldRendererCommon } from './worldrendererCommon'
import { MesherGeometryOutput } from './mesher/shared'
import { updateStatText } from './ui/newStats'

class RendererProblemReporter {
  dom = document.createElement('div')
  contextlostDom = document.createElement('div')
  mainIssueDom = document.createElement('div')

  constructor () {
    document.body.appendChild(this.dom)
    this.dom.className = 'renderer-problem-reporter'
    this.dom.appendChild(this.contextlostDom)
    this.dom.appendChild(this.mainIssueDom)
    this.dom.style.fontFamily = 'monospace'
    this.dom.style.fontSize = '20px'
    this.contextlostDom.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      color: red;
      display: flex;
      justify-content: center;
      z-index: -1;
      font-size: 18px;
      text-align: center;
    `
    this.mainIssueDom.style.cssText = `
      position: fixed;
      inset: 0;
      color: red;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: -1;
      text-align: center;
    `
    this.reportProblem(false, 'Waiting for renderer...')
    this.mainIssueDom.style.color = 'white'
  }

  reportProblem (isContextLost: boolean, message: string) {
    this.mainIssueDom.style.color = 'red'
    if (isContextLost) {
      this.contextlostDom.textContent = `Renderer context lost (try restarting the browser): ${message}`
    } else {
      this.mainIssueDom.textContent = message
    }
  }
}

export class WorldRendererWebgpu extends WorldRendererCommon {
  outputFormat = 'webgpu' as const
  newChunks = {} as Record<string, any>
  // webglData: WebglData
  stopBlockUpdate = false
  lastChunkDistance = 0
  loaded = new Set()
  allowUpdates = false
  issueReporter = new RendererProblemReporter()
  allChunksHasLoaded = false

  constructor (config) {
    super(config)

    addWebgpuListener('rendererProblem', (data) => {
      this.issueReporter.reportProblem(data.isContextLost, data.message)
    })

    this.renderUpdateEmitter.on('update', () => {
      const loadedChunks = Object.keys(this.finishedChunks).length
      updateStatText('loaded-chunks', `${loadedChunks}/${this.chunksLength} chunks (${this.lastChunkDistance}/${this.viewDistance})`)
    })
  }

  playgroundGetWebglData () {
    const playgroundChunk = Object.values(this.newChunks).find((x: any) => Object.keys(x?.blocks ?? {}).length > 0)
    if (!playgroundChunk) return
    const block = Object.values(playgroundChunk.blocks)?.[0] as any
    if (!block) return
    const { textureName } = block
    if (!textureName) return
    // return this.webglData[textureName]
  }

  setBlockStateId (pos: any, stateId: any): void {
    if (this.stopBlockUpdate) return
    super.setBlockStateId(pos, stateId)
  }

  isWaitingForChunksToRender = false

  allChunksLoaded (): void {
    if (this.allChunksHasLoaded) {
      console.log('allChunksLoaded (ignored)')
      return
    }
    this.allChunksHasLoaded = true
    console.log('allChunksLoaded')
    webgpuChannel.addBlocksSectionDone()
  }

  handleWorkerMessage (data: { geometry: MesherGeometryOutput, type, key }): void {
    if (data.type === 'geometry' && Object.keys(data.geometry.tiles).length) {
      this.addChunksToScene(data.key, data.geometry)
    }
  }

  addChunksToScene (key: string, geometry: MesherGeometryOutput) {
    if (this.loaded.has(key) && !this.allowUpdates) return
    this.loaded.add(key)
    const chunkCoords = key.split(',').map(Number) as [number, number, number]
    if (/* !this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] ||  */ !this.active) return

    addBlocksSection(key, geometry)
    this.lastChunkDistance = Math.max(...this.getDistance(new Vec3(chunkCoords[0], 0, chunkCoords[2])))

    // todo
    // this.newChunks[data.key] = data.geometry
  }

  updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void { }
  render (): void { }

  chunksReset () {
    webgpuChannel.fullReset()
  }

  updatePosDataChunk (key: string) {
  }

  async updateTexturesData (): Promise<void> {
    await super.updateTexturesData()
  }

  updateShowChunksBorder (value: boolean) {
    // todo
  }

  changeBackgroundColor (color: [number, number, number]) {
    webgpuChannel.updateBackground(color)
  }


  removeColumn (x, z) {
    // TODO! disabled for now!
    // console.log('removeColumn', x, z)
    // super.removeColumn(x, z)
    // for (const key of Object.keys(this.newChunks)) {
    //   const [xSec, _ySec, zSec] = key.split(',').map(Number)
    //   // if (Math.floor(x / 16) === x && Math.floor(z / 16) === z) {
    //   if (x === xSec && z === zSec) {
    //     // foundSections.push(key)
    //     removeBlocksSection(key)
    //   }
    // }

    // for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
    //   this.setSectionDirty(new Vec3(x, y, z), false)
    //   const key = `${x},${y},${z}`
    //   const mesh = this.sectionObjects[key]
    //   if (mesh) {
    //     this.scene.remove(mesh)
    //     dispose3(mesh)
    //   }
    //   delete this.sectionObjects[key]
    // }
  }

}