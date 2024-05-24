import { CSSProperties } from 'react'

// names: https://pixelarticons.com/free/
export default ({ iconName, width = undefined as undefined | number, styles = {} as CSSProperties, className = undefined }) => {
  if (width !== undefined) styles = { width, height: width, ...styles }
  return <iconify-icon icon={`pixelarticons:${iconName}`} style={styles} class={className} />
}
