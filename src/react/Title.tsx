import type { MessageFormatPart } from '../botUtils'
import './Title.css'

type MessageProps = {
  title?: MessageFormatPart,
  subtitle?: MessageFormatPart,
  actionBar?: MessageFormatPart,
  tooltip?: MessageFormatPart
}

export default ({
  title = {text: ""}, 
  subtitle = {text: ""}, 
  actionBar = {text: ""},
  tooltip = {text: ""}
}: MessageProps) => {
  return (
    <div className='message-container'>
      <div className='titleScreen'>
        <h1 className='message-title'>{title.text}</h1>
        <h2 className='message-subtitle'>{subtitle.text}</h2>
      </div>
      <div className='actionScreen'>
        <div className='action-bar'>{actionBar.text}</div>
        <div className='tooltip'>{tooltip.text}</div>
      </div>
    </div>
  )
}
