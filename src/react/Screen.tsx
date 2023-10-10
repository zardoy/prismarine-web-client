interface Props {
  title: string
  children: React.ReactNode
}

export default ({ title, children }: Props) => {
  return (
    <div className='fullscreen' style={{ overflow: 'auto' }}>
      <div className="screen-content">
        <div className="screen-title">{title}</div>
        {children}
      </div>
    </div>
  )
}
