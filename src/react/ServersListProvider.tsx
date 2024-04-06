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
    // todo browserfs + notifications to save
    type ResponseType = {
      version: {
        name_raw: string
      }
      // display tooltip
      players: {
        online: number
        max: number
        list: {
          name_raw: string
          name_clean: string
        }[]
      }
      icon: string
      motd: {
        raw: string
      }
      // circle error icon
      mods?: {name,version}[]
      // todo display via hammer icon
      software?: string
      plugins?: {name, version}[]
    }
    // const https://api.mcstatus.io/v2/status/java/

    for (const server of serversList) {

      server.
    }
  })

  return <ServersList
    onWorldAction={() => {}}
    onGeneralAction={() => {}}
    worldData={serversList.map(server => ({ title: server.name ?? server.ip, detail: server.version, name: server.ip }))}
  />
}
