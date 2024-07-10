import { hideCurrentModal, showModal } from '../globalState'
import defaultLocalServerOptions from '../defaultLocalServerOptions'
import { mkdirRecursive, uniqueFileNameFromWorldName } from '../browserfs'
import supportedVersions from '../supportedVersions.mjs'
import CreateWorld, { WorldCustomize, creatingWorldState } from './CreateWorld'
import { getWorldsPath } from './SingleplayerProvider'
import { useIsModalActive } from './utilsApp'

export default () => {
  const activeCreate = useIsModalActive('create-world')
  const activeCustomize = useIsModalActive('customize-world')
  if (activeCreate) {
    const versionsPerMinor = Object.fromEntries(supportedVersions.map(x => [x.split('.').slice(0, 2), x]))
    const versions = Object.values(versionsPerMinor).map(x => {
      return {
        version: x,
        label: x === defaultLocalServerOptions.version ? `${x} (available offline)` : x
      }
    })
    return <CreateWorld
      defaultVersion={defaultLocalServerOptions.version}
      cancelClick={() => {
        hideCurrentModal()
      }}
      createClick={async () => {
        // create new world
        const { title, type, version, gameMode } = creatingWorldState
        // todo display path in ui + disable if exist
        const savePath = await uniqueFileNameFromWorldName(title, getWorldsPath())
        await mkdirRecursive(savePath)
        let generation
        if (type === 'flat') {
          generation = {
            name: 'superflat',
          }
        }
        if (type === 'void') {
          generation = {
            name: 'superflat',
            layers: [],
            noDefaults: true
          }
        }
        if (type === 'nether') {
          generation = {
            name: 'nether'
          }
        }
        hideCurrentModal()
        window.dispatchEvent(new CustomEvent('singleplayer', {
          detail: {
            levelName: title,
            version,
            generation,
            'worldFolder': savePath,
            gameMode: gameMode === 'survival' ? 0 : 1,
          },
        }))
      }}
      customizeClick={() => {
        showModal({ reactType: 'customize-world' })
      }}
      versions={versions}
    />
  }
  if (activeCustomize) {
    return <WorldCustomize backClick={() => hideCurrentModal()} />
  }
  return null
}
