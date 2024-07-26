import { omitObj } from '@zardoy/utils'
import { useAutocomplete } from '@mui/base'
import { useState, CSSProperties } from 'react'
import PixelartIcon from './PixelartIcon'
import Input from './Input'
import './Select.css'


export interface OptionsStorage {
  options: readonly string[]
  selected: string
}

interface Props {
  initialOptions: OptionsStorage
  updateOptions: (options: OptionsStorage) => void
  processOption?: (option: string) => string
}

export default ({ initialOptions, updateOptions, processOption }: Props) => {
  const [options, setOptions] = useState(initialOptions)
  const [inputStyle, setInputStyle] = useState<CSSProperties | null | undefined>({})

  const autocomplete = useAutocomplete({
    value: options.selected,
    options: options.options.filter(option => option !== options.selected),
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
    },
    freeSolo: true
  })

  return <div {...autocomplete.getRootProps()} style={{ position: 'relative', width: 130 }}>
    <SelectOption
      {...omitObj(autocomplete.getInputProps(), 'ref')}
      inputRef={autocomplete.getInputProps().ref as any}
      option=''
      icon='user'
    />
    {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
      position: 'absolute',
      zIndex: 10,
      maxHeight: '100px',
      overflowY: 'scroll'
    }}>
      {autocomplete.groupedOptions.map((option, index) => {
        const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option, index })
        const optionString = processOption?.(option) ?? option
        return <SelectOption {...optionProps as any} icon='user' option={optionString} inputRef={itemRef} />
      })}
    </ul>}
  </div>
}

const SelectOption = ({ option, inputRef, icon, value, setValue, ...props }: {
  option: string,
  icon?: string
} & Record<string, any>) => {

  return <div style={{
    position: 'relative',
  }} {...props}>
    <Input
      inputRef={inputRef}
      style={{
        paddingLeft: icon ? 16 : 5,
      }}
      rootStyles={{
        width: 130,
        boxSizing: 'border-box',
      }}
      value={value}
      onChange={props.onChange}
    />
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      {icon && <PixelartIcon iconName={icon} />}
      <div style={{
        fontSize: 10,
        paddingLeft: icon ? 0 : 7,
        width: '100%',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        cursor: 'pointer'
      }}>
        {option}
      </div>
    </div>
  </div>
}
