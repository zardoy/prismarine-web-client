import { useMedia } from 'react-use'

const SMALL_SCREEN_MEDIA = '@media (max-width: 440px)'
export const useIsSmallWidth = () => {
  return useMedia(SMALL_SCREEN_MEDIA.replace('@media ', ''))
}
