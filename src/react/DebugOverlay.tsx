import { useEffect, useRef } from 'react'
import { proxy, useSnapshot } from 'valtio'
import worldInteractions from '../worldInteractions'
import styles from './DebugOverlay.module.css'


const state = proxy({
  pos: { x: 0, y: 0, z: 0 },
  rot: [ 0, 0 ]
})

export type DebugOverlayProps = {
  version: string,
  entitiesCount: number,
  dimension: string,
  entity: {
    position: {
      x: number,
      y: number,
      z: number,
    },
    yaw: number,
    pitch: number
  },
  day: number,
  packetsString: string,
  customEntries: Record<string, any>, // Assuming customEntries is a key-value pair object
  target?: typeof worldInteractions.cursorBlock,
  renderer: string,
  biome: string,
  skyL: number
}

export default ({
  version,
  entitiesCount,
  dimension,
  entity,
  day,
  packetsString,
  customEntries,
  target,
  renderer,
  biome,
  skyL
} : DebugOverlayProps) => {
  const minecraftYaw = useRef(0)
  const minecraftQuad = useRef(0)
  const pos = useSnapshot(state.pos)
  const rot = useSnapshot(state.rot)
  const quadsDescription = [
    'north (towards negative Z)',
    'east (towards positive X)',
    'south (towards positive Z)',
    'west (towards negative X)'
  ]

  const viewDegToMinecraft = (yaw) => yaw % 360 - 180 * (yaw < 0 ? -1 : 1)

  useEffect(() => {
    state.pos.x = entity.position.x
    state.pos.y = entity.position.y
    state.pos.z = entity.position.z
    state.rot[0] = entity.yaw
    state.rot[1] = entity.pitch
  }, [entity])

  useEffect(() => {
    minecraftYaw.current = viewDegToMinecraft(rot[0] * -180 / Math.PI)
    minecraftQuad.current = Math.floor(((minecraftYaw.current + 180) / 90 + 0.5) % 4)
  }, [rot[0]])

  return <>
    <div className={styles['debug-left-side']}>
      <p>Prismarine Web Client ({version})</p>
      <p>E: {entitiesCount}</p>
      <p>{dimension}</p>
      <div className={styles.empty}></div>
      <p>XYZ: {pos.x.toFixed(3)} / {pos.y.toFixed(3)} / {pos.z.toFixed(3)}</p>
      <p>Chunk: {Math.floor(pos.x % 16)} ~ {Math.floor(pos.z % 16)} in {Math.floor(pos.x / 16)} ~ {Math.floor(pos.z / 16)}</p>
      <p>Packets: {packetsString}</p>
      <p>Facing (viewer): {rot[0].toFixed(3)} {rot[1].toFixed(3)}</p>
      <p>Facing (minecraft): {quadsDescription[minecraftQuad.current]} ({minecraftYaw.current.toFixed(1)} {(rot[1] * -180 / Math.PI).toFixed(1)})</p>
      <p>Light: {skyL} ({skyL} sky)</p>

      <p>Biome: minecraft:{biome}</p>
      <p>Day: {day}</p>
      <div className={styles.empty}></div>
      {Object.entries(customEntries).map(([name, value]) => <p key={name}>{name}: {value}</p>)}
    </div>

    <div className={styles['debug-right-side']}>
      <p>Renderer: {renderer}</p>
      <div className={styles.empty}></div>
      {target ? (<>
        <p>{target.name}</p>
        {
          Object.entries(target.getProperties()).map(
            ([name, value], idx, arr) => {
              return <p key={name}>
                {name}: {
                  typeof value === 'boolean' ? (
                    <span style={{ color: value ? 'lightgreen' : 'red' }}>{value}</span>
                  ) : value
                }
              </p>
            }
          )
        }
      </>)
        : '' }
      {target ? (
        <p>Looking at: {target.position.x} {target.position.y} {target.position.z}</p>
      ) : ''}
    </div>
  </>
}
