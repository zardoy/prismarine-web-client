# Minecraft Web Client

A true Minecraft client running in your browser! A port of the original game to the web, written in JavaScript using modern web technologies.

This project is a work in progress, but I consider it to be usable. If you encounter any bugs or usability issues, please report them!

### Big Features

- Connect to any offline server* (it's possible because of proxy servers, see below)
- Open any zip world file or even folder in read-write mode!
- Singleplayer mode with simple world generation
- Works offline
- Play with friends over global network! (P2P is powered by Peer.js servers)
- First-class touch (mobile) & controller support
- Resource pack support
- even even more!

There are a lot

### World Loading

Zip files and folders are supported. Just drag and drop them into the browser window. You can open folders in readonly and read-write mode. New chunks may be generated incorrectly for now.
In case of opening zip files they are stored in your ram entirely, so there is a ~300mb file limit on IOS.
Whatever offline mode you used (zip, folder, just single player), you can always export world with the `/export` command typed in the game chat.

### Servers

You can play almost on any server, supporting offline connections.
See the [Mineflayer](https://github.com/PrismarineJS/mineflayer) repo for the list of supported versions (should support majority of versions).
There is a builtin proxy, but you can also host a your one! Just clone the repo, run `pnpm i` (following CONTRIBUTING.MD) and run `pnpm prod-start`, then you can specify `http://localhost:8080` in the proxy field.
MS account authentication will be supported soon.

<!-- TODO proxy server communication graph -->

### Things that are not planned yet

- Mods, plugins (basically JARs) support, shaders - since they all are related to specific game pipelines

### Advanced Settings

There are many many settings, that are not exposed in the UI yet. You can find or change them by opening the browser console and typing `options`. You can also change them by typing `options.<setting_name> = <value>`.

### Console

To open the console, press `F12`, or if you are on mobile, you can type `#debug` in the URL (browser address bar), it wont't reload the page, but you will see a button to open the console. This way you can change advanced settings and see all errors or warnings. Also this way you can access global variables (described below).

### Debugging

It should be easy to build/start the project locally. See [CONTRIBUTING.MD](./CONTRIBUTING.md) for more info.

There is storybook for fast UI development. Run `pnpm storybook` to start it.
There is world renderer playground ([link](https://mcon.vercel.app/playground.html)).

However, there are many things that can be done in online version. You can access some global variables in the console and useful examples:

- `localStorage.debug = '*'` - Enables all debug messages! Warning: this will start all packets spam.
Instead I recommend setting `options.debugLogNotFrequentPackets`. Also you can use `debugTopPackets` (with JSON.stringify) to see what packets were received/sent by name

- `bot` - Mineflayer bot instance. See Mineflayer documentation for more.
- `viewer` - Three.js viewer instance, basically does all the rendering.
- `viewer.world.sectionObjects` - Object with all active chunk sections (geometries) in the world. Each chunk section is a Three.js mesh or group.
- `debugSceneChunks` - The same as above, but relative to current bot position (e.g. 0,0 is the current chunk).
- `debugChangedOptions` - See what options are changed. Don't change options here.
- `localServer` - Only for singleplayer mode/host. Flying Squid server instance, see it's documentation for more.
- `localServer.overworld.storageProvider.regions` - See ALL LOADED region files with all raw data.

- `nbt.simplify(someNbt)` - Simplifies nbt data, so it's easier to read.

You can also drag and drop any .dat file into the browser window to see it's contents in the console.

### F3 Keybindings

- `F3` - Toggle debug overlay
- `F3 + A` - Reload all chunks (these that are loaded from the server)
<!-- <!-- - `F3 + N` - Restart local server (basically resets the world!) -->
- `F3 + G` - Toggle chunk sections (geometries) border visibility (aka Three.js geometry helpers)

### Notable Things that Power this Project

- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Handles all client-side communications with the server (including the builtin one) - forked
- [Flying Squid](https://github.com/prismarineJS/flying-squid) - The builtin server that makes single player possible! Here forked version is used.
- [Prismarine Provider Anvil](https://github.com/PrismarineJS/prismarine-provider-anvil) - Handles world loading (region format)
- [Prismarine Physics](https://github.com/PrismarineJS/prismarine-physics) - Does all the physics calculations
- [Minecraft Protocol](https://github.com/PrismarineJS/node-minecraft-protocol) - Makes connections to servers possible
- [Peer.js](https://peerjs.com/) - P2P networking (when you open to wan)
- [Three.js](https://threejs.org/) - Helping in 3D rendering
