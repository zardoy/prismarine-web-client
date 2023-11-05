import * as crypto from 'crypto'
import UUID from 'uuid-1345'
import { fsState } from './loadSave'


// https://github.com/PrismarineJS/node-minecraft-protocol/blob/cf1f67117d586b5e6e21f0d9602da12e9fcf46b6/src/server/login.js#L170
function javaUUID (s: string) {
  const hash = crypto.createHash('md5')
  hash.update(s, 'utf8')
  const buffer = hash.digest()
  buffer[6] = (buffer[6] & 15) | 48
  buffer[8] = (buffer[8] & 63) | 128
  return buffer
}

export function nameToMcOfflineUUID (name) {
  return (new UUID(javaUUID('OfflinePlayer:' + name))).toString()
}

export async function savePlayers () {
  await localServer!.savePlayersSingleplayer()
}

// todo flying squid should expose save function instead
export const saveServer = async () => {
  if (!localServer || fsState.isReadonly) return
  const worlds = [localServer.overworld] as Array<import('prismarine-world').world.World>
  await Promise.all([savePlayers(), ...worlds.map(async world => world.saveNow())])
}
