import { miscUiState } from './globalState'
import { configureBrowserFs } from './integratedServer/browserfsShared'
import { resetOptions } from './optionsStorage'
import { updateTexturePackInstalledState } from './resourcePack'

export const resetLocalStorageWithoutWorld = () => {
  for (const key of Object.keys(localStorage)) {
    if (!/^[\da-fA-F]{8}(?:\b-[\da-fA-F]{4}){3}\b-[\da-fA-F]{12}$/g.test(key) && key !== '/') {
      localStorage.removeItem(key)
    }
  }
  resetOptions()
}

configureBrowserFs(async () => {
  await updateTexturePackInstalledState()
  miscUiState.appLoaded = true
})
