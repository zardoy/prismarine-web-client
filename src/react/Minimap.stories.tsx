import { Vec3 } from 'vec3'
import type { Meta, StoryObj } from '@storybook/react'
import { WorldWarp } from 'flying-squid/dist/lib/modules/warps'
import { TypedEventEmitter } from 'contro-max/build/typedEventEmitter'
import { useEffect } from 'react'

import Minimap from './Minimap'
import { DrawerAdapter, MapUpdates } from './MinimapDrawer'

const meta: Meta<typeof Minimap> = {
  component: Minimap,
  decorators: [
    (Story, context) => {

      useEffect(() => {
        console.log('map updated')
        adapter.emit('updateMap')

      }, [context.args['fullMap']])

      return <div> <Story /> </div>
    }
  ]
}

export default meta
type Story = StoryObj<typeof Minimap>;


class DrawerAdapterImpl extends TypedEventEmitter<MapUpdates> implements DrawerAdapter {
  playerPosition: Vec3
  yaw: number
  warps: WorldWarp[]

  constructor (pos?: Vec3, warps?: WorldWarp[]) {
    super()
    this.playerPosition = pos ?? new Vec3(0, 0, 0)
    this.warps = warps ?? [] as WorldWarp[]
  }

  async getHighestBlockColor (x: number, z:number) {
    console.log('got color')
    return 'green'
  }

  setWarp (name: string, pos: Vec3, color: string, disabled: boolean, world?: string): void {
    const warp: WorldWarp = { name, x: pos.x, y: pos.y, z: pos.z, world, color, disabled }
    const index = this.warps.findIndex(w => w.name === name)
    if (index === -1) {
      this.warps.push(warp)
    } else {
      this.warps[index] = warp
    }
    this.emit('updateWarps')
  }
}

const adapter = new DrawerAdapterImpl()

export const Primary: Story = {
  args: {
    adapter,
    fullMap: false
  },
}