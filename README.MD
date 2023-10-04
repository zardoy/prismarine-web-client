# Minecraft Web Client

A true Minecraft client running in your browser! A port of the original game to the web, written in JavaScript using modern web technologies.

This project is a work in progress, but it should be already in playable state. If you encounter any bugs or usability issues, please report them! I can't fix all the issues myself, but will try as many as I can.

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

- Mods and jar plugins support, shaders

### Notable Things that Power this Project

- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Handles all client-side communications with the server (including the builtin one) - forked
- [Flying Squid](https://github.com/prismarineJS/flying-squid) - The builtin server that makes single player possible! Here forked version is used.
- [Prismarine Provider Anvil](https://github.com/PrismarineJS/prismarine-provider-anvil) - Handles world loading (region format)
- [Prismarine Physics](https://github.com/PrismarineJS/prismarine-physics) - Does all the physics calculations
- [Minecraft Protocol](https://github.com/PrismarineJS/node-minecraft-protocol) - Makes connections to servers possible
- [Peer.js](https://peerjs.com/) - P2P networking (when you open to wan)
- [Three.js](https://threejs.org/) - Helping in 3D rendering
