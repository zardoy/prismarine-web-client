import { loadSound, playSound } from '../basicSounds'
import buttonClickMp3 from '../../assets/button_click.mp3'
import { ButtonProvider } from './Button'

void loadSound('button_click.mp3', buttonClickMp3)

export default ({ children }) => {
  return <ButtonProvider onClick={() => {
    void playSound('button_click.mp3')
  }}>{children}</ButtonProvider>
}
