import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { filesize } from 'filesize'
import Input from './Input'
import Screen from './Screen'
import Button from './Button'
import SelectGameVersion from './SelectGameVersion'
import styles from './createWorld.module.css'

// const worldTypes = ['default', 'flat', 'largeBiomes', 'amplified', 'customized', 'buffet', 'debug_all_block_states']
const worldTypes = ['default', 'flat'/* , 'void' */]
const gameModes = ['survival', 'creative'/* , 'adventure', 'spectator' */]

export const creatingWorldState = proxy({
  title: '',
  type: worldTypes[0],
  gameMode: gameModes[0],
  version: ''
})

export default ({ cancelClick, createClick, customizeClick, versions, defaultVersion }) => {
  const [quota, setQuota] = useState('')

  const { title, type, version, gameMode } = useSnapshot(creatingWorldState)
  useEffect(() => {
    creatingWorldState.version = defaultVersion
    void navigator.storage?.estimate?.().then(({ quota, usage }) => {
      setQuota(`Storage usage: ${usage === undefined ? '?' : filesize(usage)} / ${quota ? filesize(quota) : '?'}`)
    })
  }, [])

  return <Screen title="Create world" backdrop="dirt">
    <form
      style={{ display: 'flex' }} onSubmit={(e) => {
        e.preventDefault()
        createClick()
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={({ target: { value } }) => {
          creatingWorldState.title = value
        }}
        placeholder='World name'
      />
      <SelectGameVersion
        versions={versions.map((obj) => { return { value: obj.version, label: obj.version } })}
        selected={{ value: defaultVersion, label: defaultVersion }}
        onChange={(value) => {
          creatingWorldState.version = value ?? defaultVersion
        }}
        containerStyle={{ width: '100px' }}
      />
      <button type='submit' style={{ visibility: 'hidden' }} />
    </form>
    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        const index = worldTypes.indexOf(type)
        creatingWorldState.type = worldTypes[index === worldTypes.length - 1 ? 0 : index + 1]
      }}
      >World Type: {type}
      </Button>
      {/* <Button onClick={() => customizeClick()} disabled>
        Customize
      </Button> */}
      <Button onClick={() => {
        const index = gameModes.indexOf(gameMode)
        creatingWorldState.gameMode = gameModes[index === gameModes.length - 1 ? 0 : index + 1]
      }}
      >
        Gamemode: {gameMode}
      </Button>
    </div>
    <div className='muted' style={{ fontSize: 8 }}>Default and other world types are WIP</div>

    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        cancelClick()
      }}
      >Cancel
      </Button>
      <Button disabled={!title} onClick={createClick}>Create</Button>
    </div>
    <div className='muted' style={{ fontSize: 9 }}>Note: save important worlds in folders on your hard drive!</div>
    <div className='muted' style={{ fontSize: 9 }}>{quota}</div>
  </Screen>
}

export const WorldCustomize = ({ backClick }) => {
  const { type } = useSnapshot(creatingWorldState)

  return <Screen title='Customize world' backdrop='dirt'>
    <div className={styles.world_layers_container}>
      <div className="world_layer" />
    </div>
    <Button onClick={backClick}>Back</Button>
  </Screen>
}
