// eslint-disable-next-line import/no-named-as-default
import GUI, { Controller } from 'lil-gui'
import * as THREE from 'three'
import JSZip from 'jszip'
import { BasePlaygroundScene } from '../baseScene'
import { TWEEN_DURATION } from '../../viewer/lib/entities'
import { EntityMesh } from '../../viewer/lib/entity/EntityMesh'

class MainScene extends BasePlaygroundScene {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (...args) {
    //@ts-expect-error
    super(...args)
  }

  override initGui (): void {
    // initial values
    this.params = {
      version: globalThis.includedVersions.at(-1),
      skipQs: '',
      block: '',
      metadata: 0,
      supportBlock: false,
      entity: '',
      removeEntity () {
        this.entity = ''
      },
      entityRotate: false,
      camera: '',
      playSound () { },
      blockIsomorphicRenderBundle () { },
      modelVariant: 0
    }
    this.metadataGui = this.gui.add(this.params, 'metadata')
    this.paramOptions = {
      version: {
        options: globalThis.includedVersions,
        hide: false
      },
      block: {
        options: mcData.blocksArray.map(b => b.name).sort((a, b) => a.localeCompare(b))
      },
      entity: {
        options: mcData.entitiesArray.map(b => b.name).sort((a, b) => a.localeCompare(b))
      },
      camera: {
        hide: true,
      }
    }
    super.initGui()
  }

  blockProps = {}
  metadataFolder: GUI | undefined
  metadataGui: Controller

  override onParamUpdate = {
    version () {
      // if (initialUpdate) return
      // viewer.world.texturesVersion = params.version
      // viewer.world.updateTexturesData()
      // todo warning
    },
    block: () => {
      this.blockProps = {}
      this.metadataFolder?.destroy()
      const block = mcData.blocksByName[this.params.block]
      if (!block) return
      console.log('block', block.name)
      const props = new this.Block(block.id, 0, 0).getProperties()
      const { states } = mcData.blocksByStateId[this.getBlock()?.minStateId] ?? {}
      this.metadataFolder = this.gui.addFolder('metadata')
      if (states) {
        for (const state of states) {
          let defaultValue: string | number | boolean
          if (state.values) { // int, enum
            defaultValue = state.values[0]
          } else {
            switch (state.type) {
              case 'bool':
                defaultValue = false
                break
              case 'int':
                defaultValue = 0
                break
              case 'direction':
                defaultValue = 'north'
                break

              default:
                continue
            }
          }
          this.blockProps[state.name] = defaultValue
          if (state.values) {
            this.metadataFolder.add(this.blockProps, state.name, state.values)
          } else {
            this.metadataFolder.add(this.blockProps, state.name)
          }
        }
      } else {
        for (const [name, value] of Object.entries(props)) {
          this.blockProps[name] = value
          this.metadataFolder.add(this.blockProps, name)
        }
      }
      console.log('props', this.blockProps)
      this.metadataFolder.open()
    },
    entity: () => {
      this.continuousRender = this.params.entity === 'player'
      this.entityUpdateShared()
      if (!this.params.entity) return
      if (this.params.entity === 'player') {
        viewer.entities.updatePlayerSkin('id', viewer.entities.entities.id.username, true, true)
        viewer.entities.playAnimation('id', 'running')
      }
      // let prev = false
      // setInterval(() => {
      //   viewer.entities.playAnimation('id', prev ? 'running' : 'idle')
      //   prev = !prev
      // }, 1000)

      EntityMesh.getStaticData(this.params.entity)
      // entityRotationFolder.destroy()
      // entityRotationFolder = gui.addFolder('entity metadata')
      // entityRotationFolder.add(params, 'entityRotate')
      // entityRotationFolder.open()
    },
    supportBlock: () => {
      viewer.setBlockStateId(this.targetPos.offset(0, -1, 0), this.params.supportBlock ? 1 : 0)
    },
    modelVariant: () => {
      viewer.world.mesherConfig.debugModelVariant = this.params.modelVariant === 0 ? undefined : [this.params.modelVariant]
    }
  }

  entityUpdateShared () {
    viewer.entities.clear()
    if (!this.params.entity) return
    worldView!.emit('entity', {
      id: 'id', name: this.params.entity, pos: this.targetPos.offset(0.5, 1, 0.5), width: 1, height: 1, username: localStorage.testUsername, yaw: Math.PI, pitch: 0
    })
    const enableSkeletonDebug = (obj) => {
      const { children, isSkeletonHelper } = obj
      if (!Array.isArray(children)) return
      if (isSkeletonHelper) {
        obj.visible = true
        return
      }
      for (const child of children) {
        if (typeof child === 'object') enableSkeletonDebug(child)
      }
    }
    enableSkeletonDebug(viewer.entities.entities['id'])
    setTimeout(() => {
      viewer.render()
    }, TWEEN_DURATION)
  }

  blockIsomorphicRenderBundle () {
    const { renderer } = viewer

    const canvas = renderer.domElement
    const onlyCurrent = !confirm('Ok - render all blocks, Cancel - render only current one')
    const sizeRaw = prompt('Size', '512')
    if (!sizeRaw) return
    const size = parseInt(sizeRaw, 10)
    // const size = 512

    this.ignoreResize = true
    canvas.width = size
    canvas.height = size
    renderer.setSize(size, size)

    //@ts-expect-error
    viewer.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
    viewer.scene.background = null

    const rad = THREE.MathUtils.degToRad(-120)
    viewer.directionalLight.position.set(
      Math.cos(rad),
      Math.sin(rad),
      0.2
    ).normalize()
    viewer.directionalLight.intensity = 1

    const cameraPos = this.targetPos.offset(2, 2, 2)
    const pitch = THREE.MathUtils.degToRad(-30)
    const yaw = THREE.MathUtils.degToRad(45)
    viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    // viewer.camera.lookAt(center.x + 0.5, center.y + 0.5, center.z + 0.5)
    viewer.camera.position.set(cameraPos.x + 1, cameraPos.y + 0.5, cameraPos.z + 1)

    const allBlocks = mcData.blocksArray.map(b => b.name)
    // const allBlocks = ['stone', 'warped_slab']

    let blockCount = 1
    let blockName = allBlocks[0]

    const updateBlock = () => {
      // viewer.setBlockStateId(targetPos, mcData.blocksByName[blockName].minStateId)
      this.params.block = blockName
      // todo cleanup (introduce getDefaultState)
      // TODO
      // onUpdate.block()
      // applyChanges(false, true)
    }
    void viewer.waitForChunksToRender().then(async () => {
      // wait for next macro task
      await new Promise(resolve => {
        setTimeout(resolve, 0)
      })
      if (onlyCurrent) {
        viewer.render()
        onWorldUpdate()
      } else {
        // will be called on every render update
        viewer.world.renderUpdateEmitter.addListener('update', onWorldUpdate)
        updateBlock()
      }
    })

    const zip = new JSZip()
    zip.file('description.txt', 'Generated with prismarine-viewer')

    const end = async () => {
      // download zip file

      const a = document.createElement('a')
      const blob = await zip.generateAsync({ type: 'blob' })
      const dataUrlZip = URL.createObjectURL(blob)
      a.href = dataUrlZip
      a.download = 'blocks_render.zip'
      a.click()
      URL.revokeObjectURL(dataUrlZip)
      console.log('end')

      viewer.world.renderUpdateEmitter.removeListener('update', onWorldUpdate)
    }

    async function onWorldUpdate () {
      // await new Promise(resolve => {
      //   setTimeout(resolve, 50)
      // })
      const dataUrl = canvas.toDataURL('image/png')

      zip.file(`${blockName}.png`, dataUrl.split(',')[1], { base64: true })

      if (onlyCurrent) {
        end()
      } else {
        nextBlock()
      }
    }
    const nextBlock = async () => {
      blockName = allBlocks[blockCount++]
      console.log(allBlocks.length, '/', blockCount, blockName)
      if (blockCount % 5 === 0) {
        await new Promise(resolve => {
          setTimeout(resolve, 100)
        })
      }
      if (blockName) {
        updateBlock()
      } else {
        end()
      }
    }
  }

  getBlock () {
    return mcData.blocksByName[this.params.block || 'air']
  }

  // applyChanges (metadataUpdate = false, skipQs = false) {
  override onParamsUpdate (paramName: string, object: any) {
    const metadataUpdate = paramName === 'metadata'

    const blockId = this.getBlock()?.id
    let block: import('prismarine-block').Block
    if (metadataUpdate) {
      block = new this.Block(blockId, 0, this.params.metadata)
      Object.assign(this.blockProps, block.getProperties())
      for (const _child of this.metadataFolder!.children) {
        const child = _child as import('lil-gui').Controller
        child.updateDisplay()
      }
    } else {
      try {
        block = this.Block.fromProperties(blockId ?? -1, this.blockProps, 0)
      } catch (err) {
        console.error(err)
        block = this.Block.fromStateId(0, 0)
      }
    }

    worldView!.setBlockStateId(this.targetPos, block.stateId!)
    console.log('up stateId', block.stateId)
    this.params.metadata = block.metadata
    this.metadataGui.updateDisplay()
  }

  override renderFinish () {
    for (const update of Object.values(this.onParamUpdate)) {
      // update(true)
      update()
    }
    this.onParamsUpdate('', {})
    this.gui.openAnimated()
  }
}

export default MainScene
