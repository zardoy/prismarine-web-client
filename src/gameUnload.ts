import { subscribe } from 'valtio'
import { miscUiState } from './globalState'

let toCleanup = [] as Array<() => void>

export const watchUnloadForCleanup = (func: () => void) => {
  toCleanup.push(func)
}

subscribe(miscUiState, () => {
  if (!miscUiState.gameLoaded) {
    for (const func of toCleanup) {
      func()
    }
    toCleanup = []
  }
})
