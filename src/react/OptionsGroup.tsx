import { titleCase } from 'title-case'
import { options } from '../optionsStorage'
import { OptionsGroupType, guiOptionsScheme } from '../optionsGuiScheme'
import OptionsItems, { OptionMeta } from './OptionsItems'

export const optionValueToType = (optionValue: any, item: OptionMeta) => {
  if (typeof optionValue === 'boolean' || item.values) return 'toggle'
  if (typeof optionValue === 'number') return 'slider'
  if (typeof optionValue === 'string') return 'element'
}

const finalItemsScheme: Record<keyof typeof guiOptionsScheme, OptionMeta[]> = Object.fromEntries(Object.entries(guiOptionsScheme).map(([groupName, optionsArr]) => {
  return [groupName, optionsArr.flatMap((optionsObj) => {
    return Object.entries(optionsObj).map(([optionKey, metaMerge]) => {
      const optionValue = options[optionKey]

      const type = optionValueToType(optionValue, metaMerge)
      const meta: OptionMeta = {
        id: optionKey === 'custom' ? undefined : optionKey,
        type,
        // todo I don't like the whole idea of custom. Why it is even here?
        ...optionKey === 'custom' ? {
          type: 'element',
          render: metaMerge
        } : {
          ...metaMerge,
        }
      }
      return meta
    })
  })]
}))

export default ({ group, backButtonAction }: { group: OptionsGroupType, backButtonAction? }) => {
  const items = finalItemsScheme[group]

  const title = group === 'main' ? 'Settings' : `${titleCase(group)} Settings`
  return <OptionsItems items={items} title={title} backButtonAction={backButtonAction} />
}
