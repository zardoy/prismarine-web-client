import { BasePlaygroundScene } from './baseScene'
import * as scenes from './scenes'

const qsScene = new URLSearchParams(window.location.search).get('scene')
const Scene: typeof BasePlaygroundScene = qsScene ? scenes[qsScene] : scenes.main

const scene = new Scene(Object.keys(scenes))
globalThis.scene = scene
