import { versionsByMinecraftVersion } from 'minecraft-data'
import minecraftInitialDataJson from '../generated/minecraft-initial-data.json'
import { AuthenticatedAccount } from './react/ServersListProvider'
import { setLoadingScreenStatus } from './utils'
import { downloadSoundsIfNeeded } from './soundSystem'
import { miscUiState } from './globalState'

export type ConnectOptions = {
  server?: string
  singleplayer?: any
  username: string
  proxy?: string
  botVersion?: any
  serverOverrides?
  serverOverridesFlat?
  peerId?: string
  ignoreQs?: boolean
  onSuccessfulPlay?: () => void
  autoLoginPassword?: string
  serverIndex?: string
  /** If true, will show a UI to authenticate with a new account */
  authenticatedAccount?: AuthenticatedAccount | true
  peerOptions?: any
  viewerWsConnect?: string
}

export const downloadNeededDataOnConnect = async (version: string) => {
  // todo expose cache
  const initialDataVersion = Object.keys(minecraftInitialDataJson)[0]!
  if (version === initialDataVersion) {
    // ignore cache hit
    versionsByMinecraftVersion.pc[initialDataVersion]!.dataVersion!++
  }
  setLoadingScreenStatus(`Loading data for ${version}`)
  if (!document.fonts.check('1em mojangles')) {
    // todo instead re-render signs on load
    await document.fonts.load('1em mojangles').catch(() => {
      console.error('Failed to load font, signs wont be rendered correctly')
    })
  }
  await window._MC_DATA_RESOLVER.promise // ensure data is loaded
  await downloadSoundsIfNeeded()
  miscUiState.loadedDataVersion = version
}
