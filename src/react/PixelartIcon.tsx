// names: https://pixelarticons.com/free/
export default ({ iconName, width, styles = {}, className = undefined }) => {
    return <iconify-icon icon={`pixelarticons:${iconName}`} style={{ width, height: width, ...styles }} className={className} />
}
