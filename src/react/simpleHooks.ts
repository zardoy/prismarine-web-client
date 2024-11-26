import { useUtilsEffect } from '@zardoy/react-util'
import { useMedia } from 'react-use'

const SMALL_SCREEN_MEDIA = '@media (max-width: 440px)'
export const useIsSmallWidth = () => {
  return useMedia(SMALL_SCREEN_MEDIA.replace('@media ', ''))
}

export const useCopyKeybinding = (getCopyText: () => string | undefined) => {
  useUtilsEffect(({ signal }) => {
    addEventListener('keydown', (e) => {
      if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const { activeElement } = document
        if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
          return
        }
        if (window.getSelection()?.toString()) {
          return
        }
        e.preventDefault()
        const copyText = getCopyText()
        if (!copyText) return
        void navigator.clipboard.writeText(copyText)
      }
    }, { signal })
  }, [getCopyText])
}
