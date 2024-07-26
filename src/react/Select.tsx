import { omitObj } from '@zardoy/utils'
import { useAutocomplete } from '@mui/base'
import { CSSProperties, useState } from 'react'
import PixelartIcon from './PixelartIcon'
import Input from './Input'
import Singleplayer from './Singleplayer'


export interface OptionsStorage {
  options: readonly string[]
  selected: string
}

interface Props extends React.ComponentProps<typeof Singleplayer> {
  initialOptions: OptionsStorage
  updateOptions: (proxies: OptionsStorage) => void
  processOption?: (option: string) => string
  validateInputOption?: (option: string) => CSSProperties | null | undefined
}

export default ({ initialOptions, updateOptions, processOption, validateInputOption }: Props) => {
  const [options, setOptions] = useState(initialOptions)
  const [inputStyle, setInputStyle] = useState<CSSProperties | null | undefined>({})

  const autocomplete = useAutocomplete({
    value: options.selected,
    options: options.options.filter(proxy => proxy !== options.selected),
    onInputChange (event, value, reason) {
      if (value) {
        updateOptions({
          ...options,
          selected: value
        })
        setOptions({
          ...options,
          selected: value
        })
      }
      setInputStyle(validateInputOption?.(value))
    },
    freeSolo: true
  })


  return <div {...autocomplete.getRootProps()} style={{ position: 'relative', width: 130 }}>
    <SelectOption
      {...omitObj(autocomplete.getInputProps(), 'ref')}
      inputRef={autocomplete.getInputProps().ref as any}
      icon='cellular-signal-0'
      option=''
      inputStyle={inputStyle}
    />
    {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
      position: 'absolute',
      zIndex: 1,
    }}>
      {autocomplete.groupedOptions.map((option, index) => {
        const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option, index })
        const optionString = processOption?.(option) ?? option
        return <SelectOption {...optionProps as any} option={optionString} icon='cellular-signal-0' disabled />
      })}
    </ul>}
  </div>
}

const SelectOption = ({ status, option, inputRef, value, ...props }: {
  option: string
} & Record<string, any>) => {

  return <div style={{
    position: 'relative',
    cursor: 'pointer',
  }} {...props}>
    <Input
      inputRef={inputRef}
      style={{
        paddingLeft: props.icon ? 16 : 5,
      }}
      rootStyles={{
        width: 130,
        boxSizing: 'border-box',
        ...props.inputStyle
      }}
      value={value}
      onChange={props.onChange}
    />
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}>
      {props.icon && <PixelartIcon iconName={props.icon} />}
      <div style={{
        fontSize: 10,
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingLeft: props.icon ? 0 : 5
      }}>
        {option}
      </div>
    </div>
  </div>
}
