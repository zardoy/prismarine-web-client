import { useMemo, useEffect, useState } from 'react'
import { showModal } from '../globalState'
import { useIsModalActive } from './utils'
import SignsEditor from './SignsEditor'


export default () => {
  const [text, setText] = useState<string>('')
  const isModalActive = useIsModalActive('signs-editor-screen')

  const handleInput = (text: string) => {
    setText(text)
  }

  useEffect(() => {
    if (!isModalActive) {
      const block = bot.blockAtCursor()
      if (block) {
        bot.updateSign(block, text)
      }
    }
  }, [isModalActive])

  useMemo(() => {
    bot._client.on('open_sign_entity', (packet) => {
      showModal({ reactType: 'signs-editor-screen' })
    })
  }, [])

  if (!isModalActive) return null
  return <SignsEditor isWysiwyg={false} handleInput={handleInput} />
}
