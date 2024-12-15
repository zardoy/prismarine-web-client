### Eaglercraft Comparison

This project uses proxies, Eaglercraft uses relays to connect to vanilla servers from the browser, these serve the same purpose but have different implementations. Though they have the same limitations such as increased latency and servers will complain about using VPN.

| Feature                           | This project | Eaglercraft | Description                                                                                                                                                                                                              |
| --------------------------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| General                           |              |             |                                                                                                                                                                                                                          |
| Mobile Support (touch)            | ✅(+)         | ✅           |                                                                                                                                                                                                                          |
| Gamepad Support                   | ✅            | ❌           |                                                                                                                                                                                                                          |
| A11Y                              | ✅            | ❌           | We have DOM for almost all UI so your extensions and other browser features will work natively like on any other web page (but maybe it's not needed)                                                                    |
| Game Features                     |              |             |                                                                                                                                                                                                                          |
| Servers Support (quality)         | ❌            | ✅           | Eaglercraft is vanilla Minecraft, while this project tries to emulate original game behavior at protocol level (Mineflayer is used)                                                                                      |
| Servers Support (any version)     | ✅            | ❌           | We support almost all Minecraft versions, only important if you connect to a server where you need new content like blocks or if you play with friends                                                                   |
| Singleplayer Survival Features    | ❌            | ✅           | Just like Eaglercraft this project can generate and save worlds, but generator is simple and only a few survival features are supported (look here for [supported features list](https://github.com/zardoy/space-squid)) |
| Singleplayer Maps                 | ✅            | ✅           | We support any version, but adventure maps won't work, but simple parkour and build maps might be interesting to explore...                                                                                              |
| Singleplayer Maps World Streaming | ✅            | ❌           | Thanks to Browserfs, saves can be loaded to local singleplayer server using multiple ways: from local folder, server directory (not zip), dropbox or other cloud *backend* etc...                                        |
| P2P Multiplayer                   | ✅            | ✅           | A way to connect to other browser running the project. But it's almost useless here since many survival features are not implemented. Maybe only to build / explore maps together...                                     |
| Voice Chat                        | ❌            | ✅           | Eaglercraft has custom WebRTC voice chat implementation, though it could also be easily implemented there                                                                                                                |
| Online Servers                    | ✅            | ❌           | We have custom implementation (including integration on proxy side) for joining to servers                                                                                                                               |
| Plugin Features                   | ✅            | ❌           | We have Mineflayer plugins support, like Auto Jump & Auto Parkour was added here that way                                                                                                                                |
| Direct Connection                 | ❌            | ✅           | We have DOM for almost all UI so your extensions and other browser features will work natively like on any other web page                                                                                                |
| Mods                              | ❌(roadmap)   | ❌           | This project will support mods for singleplayer. In theory its possible to implement support for modded servers on protocol level (including all needed mods)                                                            |
| Video Recording                   | ❌            | ✅           | Don't feel needed                                                                                                                                                                                                        |
| Metaverse Features                | ❌(roadmap)   | ❌           | Iframes, video streams inside of game world (custom protocol channel)                                                                                                                                                    |
| Sounds                            | ✅            | ✅(-)        | Eaglercraft has reduced sound quality, but better general support for them                                                                                                                                               |
| Resource Packs                    | ✅(--)        | ✅(-)        | Eaglercraft obviously don't support server resource pack, but this project has very limited support for them (only textures images are loadable for now)                                                                 |
| Assets Compressing                | ✅            | ✅❌          | We have advanced Minecraft data processing and good code chunk splitting so the web app will open faster and use less memory                                                                                             |
| Graphics                          |              |             |                                                                                                                                                                                                                          |
| Fancy Graphics                    | ❌            | ✅           | While Eaglercraft has top-level shaders we don't even support lighting                                                                                                                                                   |
| Fast & Efficient Graphics         | ❌(+)         | ❌           | Feels like no one needs to have 64 rendering distance work smoothly                                                                                                                                                      |
| VR                                | ✅            | ❌           | Feels like not needed feature. UI is missing in this project since DOM can't be rendered in VR so Eaglercraft could be better in that aspect                                                                             |
| AR                                | ❌            | ❌           | Would be the most useless feature                                                                                                                                                                                        |
| Minimap & Waypoints               | ✅(-)         | ❌           | We have buggy minimap, which can be enabled in settings and full map is opened by pressing `M` key                                                                                                                       |

Features available to only this project:

- CSS & JS Customization
- JS Real Time Debugging & Console Scripting (eg Devtools)

### Tech Stack

Bundler: Rsbuild!
UI: powered by React and css modules. Storybook helps with UI development.

### Rare WEB Features

There are a number of web features that are not commonly used but you might be interested in them if you decide to build your own game in the web.

TODO

| API                                                    | Usage & Description                                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Crypto` API                                           | Used to make chat features work when joining online servers with authentication.                                                              |
| `requestPointerLock({ unadjustedMovement: true })` API | Required for games. Disables system mouse acceleration (important for Mac users)                                                              |
| `navigator.keyboard.lock()`                            | (only in Chromium browsers) When entering fullscreen it allows to use any key combination like ctrl+w in the game                             |
| `navigator.keyboard.getLayoutMap()`                    | (only in Chromium browsers) To display the right keyboard symbol for the key keybinding on different keyboard layouts (e.g. QWERTY vs AZERTY) |
