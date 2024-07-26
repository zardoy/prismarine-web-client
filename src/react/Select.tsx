import { omitObj } from '@zardoy/utils'
import { useAutocomplete } from '@mui/base'
import { useState } from 'react'
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
}

type Status = 'unknown' | 'error' | 'success'

export default ({ initialOptions, updateOptions, ...props }: Props) => {
  const [options, setOptions] = useState(initialOptions)
  const autocomplete = useAutocomplete({
    value: options.selected,
    options: options.options.filter(proxy => proxy !== options.selected),
    onInputChange(event, value, reason) {
      console.log('onChange', { event, value, reason })
      if (value) {
        updateOptions({
          ...options,
          selected: value
        })
      }
    },
    freeSolo: true
  })


  return <div {...autocomplete.getRootProps()} style={{ position: 'relative', width: 130 }}>
    <MainInput
      {...omitObj(autocomplete.getInputProps(), 'ref')}
      inputRef={autocomplete.getInputProps().ref as any}
      status='unknown'
      ip=''
    />
    {autocomplete.groupedOptions && <ul {...autocomplete.getListboxProps()} style={{
      position: 'absolute',
      zIndex: 1,
      // marginTop: 10,
    }}>
      {autocomplete.groupedOptions.map((proxy, index) => {
        const { itemRef, ...optionProps } = autocomplete.getOptionProps({ option: proxy, index })
        return <MainInput {...optionProps as any} ip={proxy} disabled />
      })}
    </ul>}
  </div>
}

const MainInput = ({ status, ip, inputRef, value, setValue, ...props }: {
  status: Status
  ip: string
} & Record<string, any>) => {
  const iconPerStatus = {
    unknown: 'cellular-signal-0',
    error: 'cellular-signal-off',
    success: 'cellular-signal-3',
  }

  return <div style={{
    position: 'relative',
  }} {...props}>
    <Input
      inputRef={inputRef}
      style={{
        paddingLeft: 16,
      }}
      rootStyles={{
        width: 130
      }}
      value={value}
      // onChange={({ target: { value } }) => setValue?.(value)}
      onChange={props.onChange}
    />
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      <PixelartIcon iconName={iconPerStatus.unknown} />
      <div style={{
        fontSize: 10,
        // color: 'lightgray',
        // ellipsis
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {ip.replace(/^https?:\/\//, '')}
      </div>
    </div>
  </div>
}
