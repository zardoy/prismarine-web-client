/// <reference types="wicg-file-system-access" />

declare const THREE: typeof import('three')
// todo make optional
declare const bot: Omit<import('mineflayer').Bot, 'world' | '_client'> & {
    world: import('prismarine-world').world.WorldSync
    _client: Omit<import('minecraft-protocol').Client, 'on'> & {
        write: typeof import('./generatedClientPackets').clientWrite
        on: typeof import('./generatedServerPackets').clientOn
    }
}
declare const __type_bot: typeof bot
declare const viewer: import('prismarine-viewer/viewer/lib/viewer').Viewer
declare const worldView: import('prismarine-viewer/viewer/lib/worldDataEmitter').WorldDataEmitter | undefined
declare const localServer: import('flying-squid/dist/index').FullServer & { options } | undefined
/** all currently loaded mc data */
declare const mcData: Record<string, any>
declare const loadedData: import('minecraft-data').IndexedData
declare const customEvents: import('typed-emitter').default<{
    /** Singleplayer load requested */
    singleplayer (): void
    digStart ()
    gameLoaded (): void
    mineflayerBotCreated (): void
    search (q: string): void
}>
declare const beforeRenderFrame: Array<() => void>

declare interface Document {
    exitPointerLock?(): void
}

declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any
    }
}

declare interface Window extends Record<string, any> {}

type StringKeys<T extends object> = Extract<keyof T, string>


interface ObjectConstructor {
    keys<T extends object> (obj: T): Array<StringKeys<T>>
    entries<T extends object> (obj: T): Array<[StringKeys<T>, T[keyof T]]>
    // todo review https://stackoverflow.com/questions/57390305/trying-to-get-fromentries-type-right
    fromEntries<T extends Array<[string, any]>> (obj: T): Record<T[number][0], T[number][1]>
    assign<T extends Record<string, any>, K extends Record<string, any>> (target: T, source: K): asserts target is T & K
}

declare module '*.module.css' {
    const css: Record<string, string>
    export default css
}
declare module '*.css' {
    const css: string
    export default css
}
declare module '*.json' {
    const json: any
    export = json
}
declare module '*.png' {
    const png: string
    export default png
}

interface PromiseConstructor {
    withResolvers<T> (): {
        resolve: (value: T) => void;
        reject: (reason: any) => void;
        promise: Promise<T>;
    }
}
