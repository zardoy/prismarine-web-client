interface Props {
  title: JSX.Element | string
  children: React.ReactNode
  backdrop?: boolean | 'dirt'
  style?: React.CSSProperties
  className?: string
}

export default ({ title, children, backdrop = true, style, className }: Props) => {
  return (
    <>
      {backdrop === 'dirt' ? <div className='dirt-bg'></div> : backdrop ? <div className="backdrop"></div> : null}
      <div className={`fullscreen ${className}`} style={{ overflow: 'auto', ...style }}>
        <div className="screen-content">
          <div className="screen-title">{title}</div>
          {children}
        </div>
      </div>
    </>
  )
}
