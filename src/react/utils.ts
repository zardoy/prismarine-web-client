import { useSnapshot } from 'valtio'
import { useEffect, useRef } from 'react'
import { UAParser } from 'ua-parser-js'
import { activeModalStack, miscUiState } from '../globalState'

export const useIsModalActive = (modal: string, useIncludes = false) => {
  const allStack = useSnapshot(activeModalStack)
  return useIncludes ? allStack.some(x => x.reactType === modal) : allStack.at(-1)?.reactType === modal
}

export const useIsWidgetActive = (name: string) => {
  return useIsModalActive(`widget-${name}`)
}

export function useDidUpdateEffect (fn, inputs) {
  const isMountingRef = useRef(false)

  useEffect(() => {
    isMountingRef.current = true
  }, [])

  useEffect(() => {
    if (isMountingRef.current) {
      isMountingRef.current = false
    } else {
      return fn()
    }
  }, inputs)
}

export const useUsingTouch = () => {
  return useSnapshot(miscUiState).currentTouch
}

export const ua = new UAParser(navigator.userAgent)

export const isIos = ua.getOS().name === 'iOS'
