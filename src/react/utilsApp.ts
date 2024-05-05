import { useSnapshot } from 'valtio'
import { activeModalStack, miscUiState } from '../globalState'


export const useUsingTouch = () => {
  return useSnapshot(miscUiState).currentTouch
}
export const useIsModalActive = (modal: string, useIncludes = false) => {
  const allStack = useSnapshot(activeModalStack)
  return useIncludes ? allStack.some(x => x.reactType === modal) : allStack.at(-1)?.reactType === modal
}

export const useIsWidgetActive = (name: string) => {
  return useIsModalActive(`widget-${name}`)
}
