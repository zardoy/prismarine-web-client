export type ConnectOptions = {
  server?: string;
  singleplayer?: any;
  username: string;
  password?: any;
  proxy?: any;
  botVersion?: any;
  serverOverrides?;
  serverOverridesFlat?;
  peerId?: string;
  ignoreQs?: boolean;
  onSuccessfulPlay?: () => void
  autoLoginPassword?: string
  serverIndex?: string
}
