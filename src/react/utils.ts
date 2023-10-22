import { useSnapshot } from 'valtio'
import { useEffect, useRef } from 'react'
import { activeModalStack } from '../globalState'

export const useIsModalActive = (modal: string) => {
  return useSnapshot(activeModalStack).at(-1)?.reactType === modal
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
