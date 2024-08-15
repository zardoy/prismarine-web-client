import { useState, CSSProperties } from 'react'
import Creatable from 'react-select/creatable'
import Input from './Input'
import './Select.css'
import styles from './select.module.css'


export interface OptionStorage {
  value: string,
  label: string
}

interface Props {
  initialOptions: OptionStorage[]
  updateOptions: (options: string) => void
  processInput?: (input: string) => CSSProperties | undefined
  processOption?: (option: string) => string
  onValueChange?: (newVal: string) => void
  defaultValue?: { value: string, label: string }
  iconInput?: string
  iconOption?: string
  containerStyle?: CSSProperties
  inputProps?: React.ComponentProps<typeof Input>
}

export default ({
  initialOptions,
  updateOptions,
  processInput,
  onValueChange,
  defaultValue,
  containerStyle,
}: Props) => {
  const [inputValue, setInputValue] = useState<string | undefined>(defaultValue?.label ?? '')
  const [currValue, setCurrValue] = useState<string | undefined>(defaultValue?.label ?? '')
  const [inputStyle, setInputStyle] = useState<CSSProperties>({})

  return <Creatable
    options={initialOptions}
    aria-invalid={'true'}
    defaultValue={defaultValue}
    defaultInputValue={'input value'}
    blurInputOnSelect={true}
    hideSelectedOptions={true}
    maxMenuHeight={100}
    isClearable={true}
    // backspaceRemovesValue={true}
    onChange={(e, action) => {
      console.log('value:', e?.value)
      setCurrValue(e?.label)
      setInputValue(e?.label)
      onValueChange?.(e?.value ?? '')
      updateOptions?.(e?.value ?? '')
      setInputStyle(processInput?.(e?.value ?? '') ?? {})
    }}
    onInputChange={(e) => {
      console.log('input:', e)
      setInputValue(e)
    }}
    inputValue={inputValue}
    onFocus={(state) => {
      setInputValue(currValue)
    }}
    classNames={{
      control (state) {
        return styles.container
      },
      input (state) {
        return styles.input
      },
      option (state) {
        return styles.container
      }
    }}
    styles={{
      container (base, state) { return { ...base, position: 'relative' } },
      control (base, state) { return { ...containerStyle, ...inputStyle } },
      menu (base, state) { return { position: 'absolute', zIndex: 10 } },
      option (base, state) {
        return {
          boxSizing: 'border-box',
          padding: '3px',
          backgroundColor: state.isFocused ? '#4a4646' : 'black',
          height: 'fit-content',
          ...containerStyle
        }
      },
      input (base, state) { return {} },
      indicatorsContainer (base, state) { return { display: 'none' } },
      placeholder (base, state) { return { ...base, position: 'absolute' } },
      singleValue (base, state) { return { ...base, margin: '0px', position: 'absolute', color: 'white' } },
      valueContainer (base, state) { return { ...base, padding: '3px' } },
      noOptionsMessage (base, state) { return { display: 'none' } }
    }}
  />
}

