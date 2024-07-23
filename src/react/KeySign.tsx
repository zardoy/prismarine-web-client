import { AllKeyCodes } from 'contro-max'
import { parse } from 'mojangson'
import triangle from './ps_icons/playstation_triangle_console_controller_gamepad_icon.svg'
import square from './ps_icons/playstation_square_console_controller_gamepad_icon.svg'
import circle from './ps_icons/circle_playstation_console_controller_gamepad_icon.svg'
import cross from './ps_icons/cross_playstation_console_controller_gamepad_icon.svg'


type Props = {
  type: 'keyboard' | 'gamepad',
  val: AllKeyCodes,
  isPS?: boolean
}

export default ({ type, val, isPS }: Props) => {

  return <>
    {
      type === 'keyboard' ? parseBindingName(val) : isPS && buttonsMap[val] ? buttonsMap[val] : val
    }
  </>
}

async function parseBindingName (binding: string) {
  if (!binding) return ''

  const { keyboard } = (navigator as any)
  const layoutMap = await keyboard.getLayoutMap()

  const mapKey = key => layoutMap.get(key) || key

  const cut = binding.replaceAll(/(Numpad|Digit|Key)/g, '')
  const parts = cut.includes('+') ? cut.split('+') : [cut]

  for (let i = 0; i < parts.length; i++) {
    parts[i] = mapKey(parts[i]).split(/(?=[A-Z\d])/).reverse().join(' ')
  }

  return parts.join(' + ')
}

const buttonsMap = {
  'A': cross,
  'B': circle,
  'X': square,
  'Y': triangle
}
