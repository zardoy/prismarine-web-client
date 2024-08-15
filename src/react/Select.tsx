import { useState, CSSProperties, SyntheticEvent, useRef, useEffect } from 'react'
import Select, { CSSObjectWithLabel } from 'react-select'
import Input from './Input'
import './Select.css'
import styles from './select.module.css'


export interface OptionStorage {
  value: string,
  label: string
}

interface Props {
  initialOptions: OptionStorage[]
  updateOptions: (options: OptionStorage) => void
  processInput?: (input: string) => CSSProperties | undefined
  processOption?: (option: string) => string
  onValueChange?: (newVal: string) => void
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
  onValueChange,
  iconInput,
  iconOption,
  containerStyle,
}: Props) => {
  const [inputValue, setInputValue] = useState('')
  const [inputStyle, setInputStyle] = useState<CSSProperties>({})

  return <Select
    options={initialOptions}
    aria-invalid={'true'}
    hideSelectedOptions={true}
    isClearable={true}
    onChange={(e, action) => {
      console.log('value:', e?.value)
      setInputValue(e?.label ?? '')
      onValueChange?.(e?.value ?? '')
      setInputStyle(processInput?.(e?.value ?? '') ?? {})
    }}
    classNames={{
      control(state) {
        return styles.container
      },
      input(state) {
        return styles.input
      },
      option(state) {
        return styles.container
      }
    }}
    styles={{
      control(base, state) { return { ...containerStyle, ...inputStyle } },
      menu(base, state) { return {} },
      option(base, state) {
        return {
          boxSizing: 'border-box',
          padding: '2px 8px',
          backgroundColor: state.isFocused ? '#4a4646' : 'black',
          ...containerStyle
        }
      },
      input(base, state) { return {} },
      indicatorsContainer(base, state) { return { display: 'none' } },
      placeholder(base, state) { return { ...base, position: 'absolute' } },
      singleValue(base, state) { return { ...base, margin: '0px', position: 'absolute', color: 'white' } },
      noOptionsMessage(base, state) { return { display: 'none' } }
    }}
  />
}

