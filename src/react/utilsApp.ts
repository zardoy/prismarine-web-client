import { useSnapshot } from 'valtio'
import { useEffect, useMemo } from 'react'
import { useMedia } from 'react-use'
import { activeModalStack, miscUiState } from '../globalState'

export const watchedModalsFromHooks = new Set<string>()
// todo should not be there
export const hardcodedKnownModals = [
  'player_win:',
  'full-map' // todo
]

export const useUsingTouch = () => {
  return useSnapshot(miscUiState).currentTouch
}
export const useIsModalActive = (modal: string, useIncludes = false) => {
  useMemo(() => {
    watchedModalsFromHooks.add(modal)
  }, [])
  useEffect(() => {
    // watchedModalsFromHooks.add(modal)
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

export const useIsSmallWidth = () => {
  return useMedia('(max-width: 550px)')
}
