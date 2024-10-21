import { AuthenticatedAccount } from './react/ServersListProvider'

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
}
