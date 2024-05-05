import { loadSound, playSound } from '../basicSounds'
import { ButtonProvider } from './Button'

void loadSound('button_click.mp3')

export default ({ children }) => {
  return <ButtonProvider onClick={() => {
    void playSound('button_click.mp3')
  }}>{children}</ButtonProvider>
}
