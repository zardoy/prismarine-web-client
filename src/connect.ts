import { AuthenticatedAccount } from './react/ServersListProvider'

export type ConnectOptions = {
  server?: string
  singleplayer?: any
  username: string
  proxy?: string
  botVersion?: string
  serverOverrides?
  serverOverridesFlat?
  peerId?: string
  ignoreQs?: boolean
  onSuccessfulPlay?: () => void
  autoLoginPassword?: string
  serverIndex?: string
  authenticatedAccount?: AuthenticatedAccount | true

  connectEvents?: {
    serverCreated?: () => void
    // connect: () => void;
    // disconnect: () => void;
    // error: (err: any) => void;
    // ready: () => void;
    // end: () => void;
  }
}
