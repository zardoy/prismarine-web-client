import { useEffect, useState } from 'react'
import ServersList from './ServersList'

interface StoreServerItem {
  ip: string,
  name?: string
  version?: string
  lastJoined?: number
  proxyOverride?: string
  usernameOverride?: string
  passwordOverride?: string
}

export default () => {
  const [serversList, setServersList] = useState<StoreServerItem[]>(JSON.parse(localStorage.getItem('serversList') ?? '[]'))

  const saveServersList = () => {
    localStorage.setItem('serversList', JSON.stringify(serversList))
  }

  const worldsList = []

  useEffect(() => {
    const update = async () => {
      // todo browserfs + notifications to save
      type ResponseType = {
        version: {
          name_raw: string
        }
        // display tooltip
        players: {
          online: number
          max: number
          list: Array<{
            name_raw: string
            name_clean: string
          }>
        }
        icon: string
        motd: {
          raw: string
        }
        // circle error icon
        mods?: Array<{ name, version }>
        // todo display via hammer icon
        software?: string
        plugins?: Array<{ name, version }>
      }
      // const https://api.mcstatus.io/v2/status/java/

      for (const server of serversList) {
        // eslint-disable-next-line no-await-in-loop
        await fetch(`https://api.mcstatus.io/v2/status/java/${server.ip}`).then(async r => r.json()).then((data: ResponseType) => {
          server.version = data.version.name_raw
          server.name = data.motd.raw
          if (data.players) {
            server.name += ` (${data.players.online}/${data.players.max})`
          }
          if (data.mods) {
            server.name += ' ' + data.mods.map(mod => `${mod.name} ${mod.version}`).join(', ')
          }
          if (data.plugins) {
            server.name += ' ' + data.plugins.map(plugin => `${plugin.name} ${plugin.version}`).join(', ')
          }
        })
      }
    }
    void update()
  })

  return <ServersList
    onWorldAction={() => { }}
    onGeneralAction={() => { }}
    worldData={serversList.map(server => ({ title: server.name ?? server.ip, detail: server.version, name: server.ip }))}
  />
}
