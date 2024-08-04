import React, { CSSProperties } from 'react'
import Select from './Select'
import Input from './Input'


export default (
  { versions, selected, inputProps, onChange, updateOptions, containerStyle } :
  {
    versions: string[] | undefined,
    selected?: string,
    inputProps?: React.ComponentProps<typeof Input>,
    onChange?: (event, value, reason) => void,
    updateOptions?: (options) => void,
    containerStyle?: CSSProperties
  }
) => {
  return <Select
    initialOptions={{ options: versions ?? [], selected: selected ?? '' }}
    updateOptions={(options) => {
      updateOptions?.(options)
    }}
    onChange={onChange}
    inputProps={inputProps}
    containerStyle={containerStyle ?? { width: '190px' }}
    processInput={(value) => {
      if (!versions || !value) return {}
      const parsedsupportedVersions = versions.map(x => x.split('.').map(Number))
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
      if (!versions.includes(value)) return { border: '1px solid yellow' }
    }}
  />

}
