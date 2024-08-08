import { omitObj } from '@zardoy/utils'
import { AutocompleteChangeReason, useAutocomplete } from '@mui/base'
import { useState, CSSProperties, SyntheticEvent, useRef, useEffect } from 'react'
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
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState(initialOptions)
  const [inputStyle, setInputStyle] = useState<CSSProperties>({})

  const autocomplete = useAutocomplete({
    value: options.selected,
    options: options.options.filter(option => option !== options.selected),
    onChange,
    onInputChange (event, value, reason) {
      setInputStyle(processInput?.(value) ?? {})
      setInputValue(value)
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
    freeSolo: true,
    openOnFocus: true
  })

  return <div {...autocomplete.getRootProps()} style={{ width: 130, position: 'relative', ...containerStyle }}>
    <SelectOption
      {...omitObj(autocomplete.getInputProps(), 'ref')}
      inputRef={autocomplete.getInputProps().ref as any}
      value={inputValue}
      inputStyle={inputStyle}
      inputProps={inputProps}
      option={autocomplete.inputValue ?? ''}
      icon={iconInput ?? ''}
    />
    {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
      position: 'absolute',
      zIndex: 10,
      maxHeight: '100px',
      overflow: 'auto',
      width: containerStyle?.width ?? '130px'
    }}>
      {autocomplete.groupedOptions.map((option, index) => {
        const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option, index })
        const optionString = processOption?.(option) ?? option
        return <SelectOption {...optionProps as any} icon={iconOption ?? ''} option={optionString} />
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
  const [firstRender, setFirstRender] = useState(true)

  useEffect(() => {
    if (firstRender) setFirstRender(false)
    if (value === '' && !firstRender) props.onFocus?.()
  }, [value])

  return <div style={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  }}
  {...omitObj(props, 'id')}

  >
    {icon && <PixelartIcon styles={{ position: 'absolute', zIndex: 3 }} iconName={icon} />}
    <Input
      id={props.id}
      inputRef={inputRef}
      style={{
        paddingLeft: icon ? 16 : 5,
        width: '100%',
        // textOverflow: 'ellipsis',
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
