import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { useMemo } from 'react'
import { options } from '../optionsStorage'
import Button from './Button'
import Slider from './Slider'
import Screen from './Screen'

type GeneralItem = {
  id?: string
  text?: string,
  disabledReason?: string,
  tooltip?: string
  willHaveNoEffect?: boolean
}

export type OptionMeta = GeneralItem & ({
  type: 'toggle',
} | {
  type: 'slider'
  min?: number,
  max?: number,
  valueText?: (value: number) => string,
  unit?: string,
  delayApply?: boolean,
} | {
  type: 'element'
  render: () => React.ReactNode,
})

export const OptionButton = ({ item }: { item: Extract<OptionMeta, { type: 'toggle' }> }) => {
  const optionValue = useSnapshot(options)[item.id!]

  return <Button
    label={`${item.text}: ${optionValue ? 'ON' : 'OFF'}`}
    onClick={() => {
      options[item.id!] = !options[item.id!]
    }}
    title={item.disabledReason ? `${item.disabledReason} | ${item.tooltip}` : item.tooltip}
    disabled={!!item.disabledReason}
    style={{
      width: 150,
    }}
  />
}

export const OptionSlider = ({ item }: { item: Extract<OptionMeta, { type: 'slider' }> }) => {
  const optionValue = useSnapshot(options)[item.id!]

  const valueDisplay = useMemo(() => {
    if (item.valueText) return item.valueText(optionValue)
    return undefined // default display
  }, [optionValue])

  return <Slider label={item.text!} value={options[item.id!]} min={item.min} max={item.max} updateValue={(value) => {
    options[item.id!] = value
  }} unit={item.unit} valueDisplay={valueDisplay} updateOnDragEnd={item.delayApply} />
}

const OptionElement = ({ item }: { item: Extract<OptionMeta, { type: 'element' }> }) => {
  return item.render()
}

const RenderOption = ({ item }: { item: OptionMeta }) => {
  if (item.id) {
    item.text ??= titleCase(noCase(item.id))
  }

  if (item.type === 'toggle') return <OptionButton item={item} />
  if (item.type === 'slider') return <OptionSlider item={item} />
  if (item.type === 'element') return <OptionElement item={item} />
}

interface Props {
  readonly items: OptionMeta[]
  title: string
  backButtonAction?: () => void
}

export default ({ items, title, backButtonAction }: Props) => {
  return <Screen
    title={title}
  >
    <div className='screen-items'>
      {items.map((element, i) => {
        // make sure its unique!
        return <RenderOption key={element.id ?? `${title}-${i}`} item={element} />
      })}
    </div>
    {backButtonAction && <Button onClick={() => backButtonAction()}>Back</Button>}
  </Screen>
}
