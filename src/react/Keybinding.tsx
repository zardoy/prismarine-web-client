import { AllKeyCodes } from 'contro-max'
import { useState, useEffect } from 'react'
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
  const [bindName, setBindName] = useState('')

  async function setBind () {
    setBindName(val)
    const bind = type === 'keyboard' ? await parseBindingName(val) : isPS && buttonsMap[val] ? buttonsMap[val] : val
    setBindName(bind)
  }

  useEffect(() => {
    void setBind()
  }, [type, val, isPS])

  return <>
    {bindName}
  </>
}

export async function parseBindingName (binding: string) {
  if (!binding) return ''

  const { keyboard } = navigator
  const layoutMap = await keyboard?.getLayoutMap?.() ?? new Map<string, string>()

  const mapKey = (key: string) => layoutMap.get(key) || key

  const cut = binding.replaceAll(/(Digit|Key)/g, '')
  const parts = cut.includes('+') ? cut.split('+') : [cut]

  for (let i = 0; i < parts.length; i++) {
    parts[i] = mapKey(parts[i]).split(/(?<=[a-z])(?=\d)/).join(' ').split(/(?=[A-Z])/).reverse().join(' ')
  }

  return parts.join(' + ')
}

const buttonsMap = {
  'A': cross,
  'B': circle,
  'X': square,
  'Y': triangle
}
