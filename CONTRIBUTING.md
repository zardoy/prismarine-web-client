# Contributing Guide

After forking the repository, run the following commands to get started:

0. Ensure you have [Node.js](https://nodejs.org) and `pnpm` installed. To install pnpm run `npm i -g pnpm@9.0.4`.
1. Install dependencies: `pnpm i`
2. Start the project in development mode: `pnpm start`

## Project Structure

- `src` - main app source code
- `src/react` - React components - almost all UI is in this folder. Almost every component has its base (reused in app and storybook) and `Provider` - which is a component that provides context to its children. Consider looking at DeathScreen component to see how it's used.
- `src/menus` - Old Lit Element GUI. In the process of migration to React.

- `prismarine-viewer` - Improved version of <https://github.com/prismarineJS/prismarine-viewer>. Here is everything related to rendering the game world itself (no ui at all). Two most important parts here are:
- `prismarine-viewer/viewer/lib/worldrenderer.ts` - adding new objects to three.js happens here (sections)
- `prismarine-viewer/viewer/lib/models.ts` - preparing data for rendering (blocks) - happens in worker: out file - `worker.js`, building - `prismarine-viewer/buildWorker.mjs`
- `prismarine-viewer/examples/playground.ts` - Playground (source of <mcraft.fun/playground.html>) Use this for testing render changes. You can also modify playground code.

How different modules are used:

- `mineflayer` - provider `bot` variable and as mineflayer states it is a wrapper for the `node-minecraft-protocol` module and is used to connect and interact with real Java Minecraft servers. However not all events & properties are exposed and sometimes you have to use `bot._client.on('packet_name', data => ...)` to handle packets that are not handled via mineflayer API. Also you can use almost any mineflayer plugin.

## Making protocol changes

You can get a description of packets for the latest protocol version from <https://wiki.vg/Protocol> and for previous protocol versions from <https://wiki.vg/Protocol_version_numbers> (look for *Page* links that have *Protocol* in URL).

Also there are [src/generatedClientPackets.ts](src/generatedClientPackets.ts) and [src/generatedServerPackets.ts](src/generatedServerPackets.ts) files that have definitions of packets that come from the server and the client respectively. These files are generated from the protocol files. Protocol, blocks info and other data go from <https://github.com/prismarineJS/minecraft-data> repository.

### Would be useful to have

- cleanup folder & modules structure, cleanup playground code

A few other notes:

- Use `next` branch for development and as base & target branch for pull requests if possible.
- To link dependency locally e.g. flying-squid add this to `pnpm` > `overrides` of root package.json: `"flying-squid": "file:../space-squid",` (with some modules `pnpm link` also works)

- It's recommended to use debugger for debugging. VSCode has a great debugger built-in. If debugger is slow, you can use `--no-sources` flag that would allow browser to speedup .map file parsing.
- Some data are cached between restarts. If you see something doesn't work after upgrading dependencies, try to clear the by simply removing the `dist` folder.
- The same folder `dist` is used for both development and production builds, so be careful when deploying the project.
- Use `start-prod` script to start the project in production mode after running the `build` script to build the project.
