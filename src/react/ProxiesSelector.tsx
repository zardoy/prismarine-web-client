import Input from './Input'
import PixelartIcon from './PixelartIcon'


type Status = 'unknown' | 'error' | 'success'

export default ({ status, ip, inputRef, value, setValue, ...props }: {
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
