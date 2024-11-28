import { fromFormattedString } from '@xmcl/text-component'

export const formattedStringToSimpleString = (str) => {
  const result = fromFormattedString(str)
  str = result.text
  // todo recursive
  for (const extra of result.extra) {
    str += extra.text
  }
  return str
}
