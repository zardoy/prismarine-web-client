import { useSnapshot } from 'valtio'
import { useEffect, useMemo } from 'react'
import { activeModalStack, miscUiState } from '../globalState'

export const watchedModalsFromHooks = new Set<string>()
// todo should not be there
export const hardcodedKnownModals = [
  'player_win:'
]

export const useUsingTouch = () => {
  return useSnapshot(miscUiState).currentTouch
}
export const useIsModalActive = (modal: string, useIncludes = false) => {
  useMemo(() => {
    watchedModalsFromHooks.add(modal)
  }, [])
  useEffect(() => {
    return () => {
      watchedModalsFromHooks.delete(modal)
    }
  }, [])

  const allStack = useSnapshot(activeModalStack)
  return useIncludes ? allStack.some(x => x.reactType === modal) : allStack.at(-1)?.reactType === modal
}

export const useIsWidgetActive = (name: string) => {
  return useIsModalActive(`widget-${name}`)
}
