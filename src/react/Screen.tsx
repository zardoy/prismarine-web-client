interface Props {
  title: string
  children: React.ReactNode
  backdrop?: boolean
}

export default ({ title, children, backdrop = true }: Props) => {
  return (
    <>
      {backdrop && <div className="backdrop"></div>}
      <div className='fullscreen' style={{ overflow: 'auto' }}>
        <div className="screen-content">
          <div className="screen-title">{title}</div>
          {children}
        </div>
      </div>
    </>
  )
}
