import { omitObj } from '@zardoy/utils'
import { AutocompleteChangeReason, useAutocomplete } from '@mui/base'
import { useState, CSSProperties, SyntheticEvent, useRef } from 'react'
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
  processInput?: (input: string) => CSSProperties | undefined
  processOption?: (option: string) => string
  onChange?: (event: SyntheticEvent, value: string | null, reason: AutocompleteChangeReason) => void
  iconInput?: string
  iconOption?: string
  containerStyle?: CSSProperties
  inputProps?: React.ComponentProps<typeof Input>
}

export default ({
  initialOptions,
  updateOptions,
  processOption,
  processInput,
  onChange,
  iconInput,
  iconOption,
  containerStyle,
  inputProps
}: Props) => {
  const [options, setOptions] = useState(initialOptions)
  const [inputStyle, setInputStyle] = useState<CSSProperties>({})

  const autocomplete = useAutocomplete({
    value: options.selected,
    options: options.options.filter(option => option !== options.selected),
    onChange,
    onInputChange (event, value, reason) {
      setInputStyle(processInput?.(value) ?? {})
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

  return <div {...autocomplete.getRootProps()} style={{ width: 130, ...containerStyle }}>
    <SelectOption
      {...omitObj(autocomplete.getInputProps(), 'ref')}
      inputRef={autocomplete.getInputProps().ref as any}
      inputStyle={inputStyle}
      option={autocomplete.inputValue ?? ''}
      inputProps={inputProps}
      icon={iconInput ?? ''}
    />
    {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
      position: 'absolute',
      zIndex: 10,
      maxHeight: '100px',
      overflowY: 'scroll',
      width: containerStyle?.width ?? '130px'
    }}>
      {autocomplete.groupedOptions.map((option, index) => {
        const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option, index })
        const optionString = processOption?.(option) ?? option
        return <SelectOption {...optionProps as any} icon={iconOption ?? ''} option={optionString} inputRef={itemRef} />
      })}
    </ul>}
  </div>
}

const SelectOption = ({ option, inputRef, icon, inputStyle, inputProps, value, setValue, ...props }: {
  option: string,
  icon?: string,
  inputProps?: React.ComponentProps<typeof Input>
  inputStyle?: CSSProperties
} & Record<string, any>) => {

  return <div style={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }} {...props}>
    {icon && <PixelartIcon styles={{ position: 'absolute', zIndex: 3 }} iconName={icon} />}
    <Input
      inputRef={inputRef}
      style={{
        paddingLeft: icon ? 16 : 5,
        width: '100%',
        textOverflow: 'ellipsis',
        left: '0px',
      }}
      rootStyles={{
        width: '99%',
        border: '1px solid grey',
        ...inputStyle
      }}
      value={option}
      onChange={props.onChange}
      {...inputProps}
    />
  </div>
}
