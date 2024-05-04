import type { Meta, StoryObj } from '@storybook/react'
import 'iconify-icon'

import { useState } from 'react'
import AddServer from './AddServer'
import ServersList from './ServersList'

const meta: Meta<typeof ServersList> = {
  component: ServersList,
  render (args) {
    const [addOpen, setAddOpen] = useState(false)

    return addOpen ?
      <AddServer onBack={() => {
        setAddOpen(false)
      }}
      onConfirm={(info) => {
        console.log('add server', info)
      }} /> :
      <ServersList
        worldData={[{
          name: 'test',
          title: 'Server',
          formattedTextOverride: 'play yes',
        }]}
        joinServer={(ip) => {
          console.log('joinServer', ip)
        }}
        initialProxies={{
          proxies: ['localhost', 'mc.hypixel.net'],
          selected: 'localhost',
        }}
        updateProxies={newData => {
          console.log('setProxies', newData)
        }}
        onWorldAction={() => {}}
        onGeneralAction={(action) => {
          if (action === 'create') {
            setAddOpen(true)
          }
        }}
      />
  },
}

export default meta
type Story = StoryObj<typeof ServersList>;

export const Primary: Story = {
  args: {
  },
}
