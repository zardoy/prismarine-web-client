import React, { CSSProperties } from 'react'
import supportedVersions from '../supportedVersions.mjs'
import Select from './Select'
import Input from './Input'


export default (
  { inputProps, onChange, updateOptions, containerStyle } :
  {
    inputProps?: React.ComponentProps<typeof Input>,
    onChange?: (event, value, reason) => void,
    updateOptions?: (options) => void,
    containerStyle?: CSSProperties
  }
) => {

  return <Select
    initialOptions={{ options: supportedVersions ?? [], selected: '' }}
    updateOptions={(options) => {
      updateOptions?.(options)
    }}
    onChange={onChange}
    inputProps={inputProps}
    containerStyle={containerStyle ?? { width: '190px' }}
    processInput={(value) => {
      if (!supportedVersions || !value) return {}
      const parsedsupportedVersions = supportedVersions.map(x => x.split('.').map(Number))
      const parsedValue = value.split('.').map(Number)

      const compareVersions = (v1, v2) => {
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
          const num1 = v1[i] || 0
          const num2 = v2[i] || 0
          if (num1 > num2) return 1
          if (num1 < num2) return -1
        }
        return 0
      }

      parsedsupportedVersions.sort(compareVersions)
      const minVersion = parsedsupportedVersions[0]
      const maxVersion = parsedsupportedVersions.at(-1)

      const isWithinRange = compareVersions(parsedValue, minVersion) >= 0 && compareVersions(parsedValue, maxVersion) <= 0
      if (!isWithinRange) return { border: '1px solid red' }
      if (!supportedVersions.includes(value)) return { border: '1px solid yellow' }
    }}
  />

}
