import triangle from './ps_icons/playstation_triangle_console_controller_gamepad_icon.svg'
import square from './ps_icons/playstation_square_console_controller_gamepad_icon.svg'
import circle from './ps_icons/circle_playstation_console_controller_gamepad_icon.svg'
import cross from './ps_icons/cross_playstation_console_controller_gamepad_icon.svg'


type Props = {
  type: 'keyboard' | 'gamepad'
}

export default () => {

  return <></>
}

const parseBindingName = (binding: string | undefined) => {
  if (!binding) return ''
  const cut = binding.replaceAll(/(Numpad|Digit|Key)/g, '')

  const parts = cut.includes('+') ? cut.split('+') : [cut]
  for (let i = 0; i < parts.length; i++) {
    parts[i] = parts[i].split(/(?=[A-Z\d])/).reverse().join(' ')
  }
  return parts.join(' + ')
}

const buttonsMap = {
  'A': cross,
  'B': circle,
  'X': square,
  'Y': triangle
}
