import { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { disconnect } from '../utils'
import { MessageFormatPart, formatMessage } from '../botUtils'
import { showModal, hideModal, activeModalStack } from '../globalState'
import { options } from '../optionsStorage'
import DeathScreen from './DeathScreen'
import { useIsModalActive } from './utils'

const dieReasonProxy = proxy({ value: null as MessageFormatPart[] | null })

export default () => {
  const { value: dieReasonMessage } = useSnapshot(dieReasonProxy)
  const isModalActive = useIsModalActive('death-screen')

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
    bot.on('health', () => { // bot.isAlive can be already false so can't use death event (respawn packet)
      if (dieReasonProxy.value || bot.health > 0) return
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

  if (!isModalActive || !dieReasonMessage || options.autoRespawn) return null

  return <DeathScreen
    dieReasonMessage={dieReasonMessage}
    respawnCallback={() => {
      bot._client.write('client_command', bot.supportFeature('respawnIsPayload') ? { payload: 0 } : { actionId: 0 })
    }}
    disconnectCallback={() => {
      void disconnect()
    }}
  />
}
