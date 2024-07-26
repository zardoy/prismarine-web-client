import { forwardRef, ForwardedRef } from 'react'
import { omitObj } from '@zardoy/utils'
import { useAutocomplete } from '@mui/base'
import { CSSProperties, useState } from 'react'
import PixelartIcon from './PixelartIcon'
import { Popper } from '@mui/base/Popper'
import { unstable_useForkRef as useForkRef } from '@mui/utils'
import Input from './Input'


export interface OptionsStorage {
  options: readonly string[]
  selected: string
}

interface Props {
  initialOptions: OptionsStorage
  updateOptions: (options: OptionsStorage) => void
  processOption?: (option: string) => string
  validateInputOption?: (option: string) => CSSProperties | null | undefined
}

export default forwardRef((props: Props, ref: ForwardedRef<HTMLElement>) => {
  const { initialOptions, updateOptions, processOption, validateInputOption } = props
  const [options, setOptions] = useState(initialOptions)
  const [inputStyle, setInputStyle] = useState<CSSProperties | null | undefined>({})

  const { 
    anchorEl, 
    getRootProps, 
    getInputProps, 
    setAnchorEl, 
    popupOpen, 
    getListboxProps,
    groupedOptions,
    getOptionProps
  } = useAutocomplete({
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
      setInputStyle(validateInputOption?.(value))
    },
    freeSolo: true
  })

  const rootRef = useForkRef(ref, setAnchorEl)

  return <div>
    <div {...getRootProps()} ref={rootRef} style={{ position: 'relative', width: 130 }}>
      <SelectOption
        {...omitObj(getInputProps(), 'ref')}
        inputRef={getInputProps().ref as any}
        icon='cellular-signal-0'
        option=''
        inputStyle={inputStyle ?? undefined}
      />
    </div>
    {anchorEl && <Popper open={popupOpen} anchorEl={anchorEl}>
      {groupedOptions && <ul {...getListboxProps()} style={{
        // position: 'absolute',
        zIndex: 1,
        maxHeight: '100px',
        overflowY: 'scroll'
      }}>
        {groupedOptions.map((option, index) => {
          const optionString = processOption?.(option) ?? option
          return <SelectOption 
            option={optionString} 
            icon='cellular-signal-0' 
            {...getOptionProps({ option, index })} 
          />
        })}
      </ul>}
    </Popper>
    }
  </div>
})

const SelectOption = ({ status, option, inputRef, inputStyle, value, ...props }: {
  option: string,
  inputStyle?: CSSProperties
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
        ...inputStyle
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
