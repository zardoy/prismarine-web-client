# Minecraft Web Client

![banner](./docs-assets/banner.jpg)

A true Minecraft client running in your browser! A port of the original game to the web, written in JavaScript using modern web technologies.

If you encounter any bugs or usability issues, please report them!

You can try this out at [mcraft.fun](https://mcraft.fun/), [pcm.gg](https://pcm.gg) (short link) [mcon.vercel.app](https://mcon.vercel.app/) or the GitHub pages deploy. Every commit from the `develop` (default) branch is deployed to [s.mcraft.fun](https://s.mcraft.fun/) - so it's usually newer, but might be less stable.

### Big Features

- Open any zip world file or even folder in read-write mode!
- Connect to cracked servers* (it's possible because of proxy servers, see below)
- Singleplayer mode with simple world generations!
- Works offline
- Play with friends over internet! (P2P is powered by Peer.js discovery servers)
- First-class touch (mobile) & controller support
- Resource pack support
- Builtin JEI with recipes & guides for every item (also replaces creative inventory)
- even even more!

All components that are in [Storybook](https://mcraft.fun/storybook) are published as npm module and can be used in other projects: [`minecraft-react`](https://npmjs.com/minecraft-react)

### Recommended Settings

- Controls -> **Raw Input** -> **On** - This will make the controls more precise
- Controls -> **Touch Controls Type** -> **Joystick**
- Controls -> **Auto Full Screen** -> **On** - To avoid ctrl+w issue
- Interface -> **Chat Select** -> **On** - To select chat messages

### World Loading

Zip files and folders are supported. Just drag and drop them into the browser window. You can open folders in readonly and read-write mode. New chunks may be generated incorrectly for now.
In case of opening zip files they are stored in your ram entirely, so there is a ~300mb file limit on IOS.
Whatever offline mode you used (zip, folder, just single player), you can always export world with the `/export` command typed in the game chat.

![docs-assets/singleplayer-future-city-1-10-2.jpg](./docs-assets/singleplayer-future-city-1-10-2.jpg)

### Servers

You can play almost on any server, supporting offline connections.
See the [Mineflayer](https://github.com/PrismarineJS/mineflayer) repo for the list of supported versions (should support majority of versions).
There is a builtin proxy, but you can also host a your one! Just clone the repo, run `pnpm i` (following CONTRIBUTING.MD) and run `pnpm prod-start`, then you can specify `http://localhost:8080` in the proxy field.
MS account authentication will be supported soon.

### Rendering

#### Three.js Renderer

- Uses WebGL2. Chunks are rendered using Geometry Buffers prepared by 4 mesher workers.
- Entities & text rendering
- Supports resource packs
- Doesn't support occlusion culling

<!-- TODO proxy server communication graph -->

### Things that are not planned yet

- Mods, plugins (basically JARs) support, shaders - since they all are related to specific game pipelines

### Advanced Settings

There are many many settings, that are not exposed in the UI yet. You can find or change them by opening the browser console and typing `options`. You can also change them by typing `options.<setting_name> = <value>`.

### Console

To open the console, press `F12`, or if you are on mobile, you can type `#debug` in the URL (browser address bar), it wont't reload the page, but you will see a button to open the console. This way you can change advanced settings and see all errors or warnings. Also this way you can access global variables (described below).

### Debugging

It should be easy to build/start the project locally. See [CONTRIBUTING.MD](./CONTRIBUTING.md) for more info.

There is world renderer playground ([link](https://mcon.vercel.app/playground.html)).

However, there are many things that can be done in online version. You can access some global variables in the console and useful examples:

- `localStorage.debug = '*'` - Enables all debug messages! Warning: this will start all packets spam.
Instead I recommend setting `options.debugLogNotFrequentPackets`. Also you can use `debugTopPackets` (with JSON.stringify) to see what packets were received/sent by name

- `bot` - Mineflayer bot instance. See Mineflayer documentation for more.
- `viewer` - Three.js viewer instance, basically does all the rendering.
- `viewer.world.sectionObjects` - Object with all active chunk sections (geometries) in the world. Each chunk section is a Three.js mesh or group.
- `debugSceneChunks` - The same as above, but relative to current bot position (e.g. 0,0 is the current chunk).
- `debugChangedOptions` - See what options are changed. Don't change options here.
- `localServer`/`server` - Only for singleplayer mode/host. Flying Squid server instance, see it's documentation for more.
- `localServer.overworld.storageProvider.regions` - See ALL LOADED region files with all raw data.

- `nbt.simplify(someNbt)` - Simplifies nbt data, so it's easier to read.

The most useful thing in devtools is the watch expression. You can add any expression there and it will be re-evaluated in real time. For example, you can add `viewer.camera.position` to see the camera position and so on.

<img src="./docs-assets/watch-expr.png" alt="Watch expression" width="480"/>

You can also drag and drop any .dat or .mca (region files) into the browser window to see it's contents in the console.

### F3 Keybindings

- `F3` - Toggle debug overlay
- `F3 + A` - Reload all chunks (these that are loaded from the server)
<!-- <!-- - `F3 + N` - Restart local server (basically resets the world!) -->
- `F3 + G` - Toggle chunk sections (geometries) border visibility + entities outline (aka Three.js geometry helpers)

world chunks have a *yellow* border, hostile mobs have a *red* outline, passive mobs have a *green* outline, players have a *blue* outline.

### Query Parameters

Press `Y` to set query parameters to url of your current game state.

- `?ip=<server_address>` - Display connect screen to the server on load
- `?username=<username>` - Set the username for server
- `?proxy=<proxy_address>` - Set the proxy server address to use for server
- `?version=<version>` - Set the version for server
- `?lockConnect=true` - Disable cancel / save buttons, useful for integrates iframes
- `?reconnect=true` - Reconnect to the server on page reloads. Available in **dev mode only** and very useful on server testing.
<!-- - `?password=<password>` - Set the password on load -->
- `?loadSave=<save_name>` - Load the save on load with the specified folder name (not title)
- `?singleplayer=1` - Create empty world on load. Nothing will be saved
- `?noSave=true` - Disable auto save on unload / disconnect / export. Only manual save with `/save` command will work

- `?map=<map_url>` - Load the map from ZIP. You can use any url, but it must be CORS enabled.
- `?setting=<setting_name>:<setting_value>` - Set the and lock the setting on load. You can set multiple settings by separating them with `&` e.g. `?setting=autoParkour:true&setting=renderDistance:4`

### Notable Things that Power this Project

- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Handles all client-side communications with the server (including the builtin one) - forked
- [Forked Flying Squid (Space Squid)](https://github.com/zardoy/space-squid) - The builtin offline server that makes single player & P2P possible!
- [Prismarine Provider Anvil](https://github.com/PrismarineJS/prismarine-provider-anvil) - Handles world loading (region format)
- [Prismarine Physics](https://github.com/PrismarineJS/prismarine-physics) - Does all the physics calculations
- [Minecraft Protocol](https://github.com/PrismarineJS/node-minecraft-protocol) - Makes connections to servers possible
- [Peer.js](https://peerjs.com/) - P2P networking (when you open to wan)
- [Three.js](https://threejs.org/) - Helping in 3D rendering

### Alternatives

- [https://github.com/ClassiCube/ClassiCube](ClassiCube - Better C# Rewrite) [DEMO](https://www.classicube.net/server/play/?warned=true)
