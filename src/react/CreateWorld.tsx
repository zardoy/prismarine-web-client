import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { filesize } from 'filesize'
import Input from './Input'
import Screen from './Screen'
import Button from './Button'
import styles from './createWorld.module.css'

// const worldTypes = ['default', 'flat', 'largeBiomes', 'amplified', 'customized', 'buffet', 'debug_all_block_states']
const worldTypes = ['plains', 'flat'/* , 'void' */]

export const creatingWorldState = proxy({
  title: '',
  type: worldTypes[0],
  version: ''
})

export default ({ cancelClick, createClick, customizeClick, versions, defaultVersion }) => {
  const [quota, setQuota] = useState('')

  const { title, type, version } = useSnapshot(creatingWorldState)
  useEffect(() => {
    creatingWorldState.version = defaultVersion
    void navigator.storage?.estimate?.().then(({ quota, usage }) => {
      setQuota(`Storage usage: ${usage === undefined ? '?' : filesize(usage)} / ${quota ? filesize(quota) : '?'}`)
    })
  }, [])

  return <Screen title="Create world" backdrop="dirt">
    <div style={{ display: 'flex' }}>
      <Input
        autoFocus
        value={title}
        onChange={({ target: { value } }) => {
          creatingWorldState.title = value
        }}
        onEnterPress={() => {
          createClick()
        }}
        placeholder='World name'
      />
      <select value={version} onChange={({ target: { value } }) => {
        creatingWorldState.version = value
      }}>
        {versions.map(({ version, label }) => {
          return <option key={version} value={version}>{label}</option>
        })}
      </select>
    </div>
    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        const index = worldTypes.indexOf(type)
        creatingWorldState.type = worldTypes[index === worldTypes.length - 1 ? 0 : index + 1]
      }}>{type}</Button>
      <Button onClick={() => customizeClick()} disabled>
        Customize
      </Button>
    </div>
    <div className='muted' style={{ fontSize: 8 }}>Default and other world types are WIP</div>

    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        cancelClick()
      }}>Cancel</Button>
      <Button disabled={!title} onClick={createClick}>Create</Button>
    </div>
    <div className='muted' style={{ fontSize: 9 }}>Note: store important saves in folders on the drive!</div>
    <div className='muted' style={{ fontSize: 9 }}>{quota}</div>
  </Screen>
}

export const WorldCustomize = ({ backClick }) => {
  const { type } = useSnapshot(creatingWorldState)

  return <Screen title='Customize world' backdrop='dirt'>
    <div className={styles.world_layers_container}>
      <div className="world_layer">

      </div>
    </div>
    <Button onClick={backClick}>Back</Button>
  </Screen>
}
