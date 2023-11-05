import { supportedVersions } from 'flying-squid/src/lib/version'
import { hideCurrentModal, showModal } from '../globalState'
import defaultLocalServerOptions from '../defaultLocalServerOptions'
import { mkdirRecursive, uniqueFileNameFromWorldName } from '../browserfs'
import CreateWorld, { WorldCustomize, creatingWorldState } from './CreateWorld'
import { useIsModalActive } from './utils'

export default () => {
  const activeCreate = useIsModalActive('create-world')
  const activeCustomize = useIsModalActive('customize-world')
  if (activeCreate) {
    const versions = supportedVersions.map(x => {
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
        const { title, type, version } = creatingWorldState
        // todo display path in ui + disable if exist
        const savePath = await uniqueFileNameFromWorldName(title, `/data/worlds`)
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
            'worldFolder': savePath
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
