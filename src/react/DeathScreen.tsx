import './deathScreen.css'
import type { MessageFormatPart } from '../botUtils'
import MessageFormatted from './MessageFormatted'
import Button from './Button'

type Props = {
  dieReasonMessage: readonly MessageFormatPart[]
  respawnCallback: () => void
  disconnectCallback: () => void
}

export default ({ dieReasonMessage, respawnCallback, disconnectCallback }: Props) => {
  return (
    <div className='deathScreen-container'>
      <div className="deathScreen">
        <h1 className='deathScreen-title'>You Died!</h1>
        <h5 className='deathScreen-reason'>
          <MessageFormatted parts={dieReasonMessage} />
        </h5>
        <div className='deathScreen-buttons-grouped'>
          <Button label="Respawn" onClick={() => {
            respawnCallback()
          }} />
          <Button label="Disconnnect" onClick={() => {
            disconnectCallback()
          }} />
        </div>
      </div>
    </div>
  )
}
