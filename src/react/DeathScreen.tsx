import { useEffect } from 'react'
import './deathScreen.css'
import { proxy, useSnapshot } from 'valtio'
import { disconnect } from '../utils'
import { MessageFormatPart, formatMessage } from '../botUtils'
import { options } from '../optionsStorage'
import { hideModal, showModal } from '../globalState'
import MessageFormatted from './MessageFormatted'

const dieReasonProxy = proxy({ value: null as MessageFormatPart[] | null })

export default () => {
  const { value: dieReasonMessage } = useSnapshot(dieReasonProxy)

  useEffect(() => {
    type DeathEvent = {
      playerId: number
      entityId: number
      message: string
    }

    bot._client.on('death_combat_event', (data: DeathEvent) => {
      try {
        if (data.playerId !== bot.entity.id) return
        const messageParsed = JSON.parse(data.message)
        const parts = formatMessage(messageParsed)
        dieReasonProxy.value = parts
      } catch (err) {
        console.error(err)
      }
    })
    bot.on('death', () => {
      if (dieReasonProxy.value) return
      dieReasonProxy.value = []
    })

    bot.on('respawn', () => {
      // todo don't close too early, instead wait for health event and make button disabled?
      dieReasonProxy.value = null
    })

    if (bot.health === 0) {
      dieReasonProxy.value = []
    }
  }, [])

  useEffect(() => {
    if (dieReasonProxy.value) {
      showModal({ reactType: 'death-screen' })
    } else {
      hideModal({ reactType: 'death-screen' })
    }
  }, [dieReasonMessage])

  if (!dieReasonMessage || options.autoRespawn) return null

  return (
    <div className='deathScreen-container'>
      <div className="deathScreen">
        <h1 className='deathScreen-title'>You Died!</h1>
        <h5 className='deathScreen-reason'>
          <MessageFormatted parts={dieReasonMessage} />
        </h5>
        <div className='deathScreen-buttons-grouped'>
          <pmui-button pmui-label="Respawn" onClick={() => {
            console.log('respawn')
            bot._client.write('client_command', bot.supportFeature('respawnIsPayload') ? { payload: 0 } : { actionId: 0 })
          }} />
          <pmui-button pmui-label="Disconnnect" onClick={() => {
            disconnect()
          }} />
        </div>
      </div>
    </div>
  )
}
