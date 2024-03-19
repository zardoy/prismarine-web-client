import { useMemo, useEffect, useState, useRef } from 'react'
import { remark } from 'remark'
import { showModal, hideModal } from '../globalState'
import { MessageFormatPart } from '../botUtils'
import { setDoPreventDefault } from '../controls'
import { options } from '../optionsStorage'
import { ProseMirrorView } from './prosemirror-markdown'
import { useIsModalActive } from './utils'
import SignEditor, { ResultType } from './SignEditor'


const isWysiwyg = async () => {
  const items = await bot.tabComplete('/', true, true)
  const commands = new Set<string>(['data'])
  for (const item of items) {
    if (commands.has(item.match as unknown as string)) {
      return true
    }
  }
  return false
}

const getAST = async (markdown: string) => {
  const arr = markdown.split('\n\n')
  return arr.map(md => remark().parse(md))
}



export default () => {
  const [location, setLocation] = useState<{x: number, y: number, z: number} | null>(null)
  const text = useRef<string[]>(['', '', '', ''])
  const [enableWysiwyg, setEnableWysiwyg] = useState(false)
  const isModalActive = useIsModalActive('signs-editor-screen')

  const handleClick = (result: ResultType) => {
    hideModal({ reactType: 'signs-editor-screen' })
    if (!enableWysiwyg) return
    if ('plainText' in result) {

    }
  }

  const handleInput = (target: HTMLInputElement) => {
    const smallSymbols = /[()[\]{} ]/
    const largeSymbols = /[;|',.]/
    let addLength = 0
    for (const letter of target.value) {
      if (smallSymbols.test(letter)) {
        addLength += 1 - 1 / 1.46
      } else if (largeSymbols.test(letter)) {
        addLength += 1 - 1 / 3
      }
    }
    text.current[Number(target.dataset.key)] = target.value
    target.setAttribute('maxlength', `${15 + Math.ceil(addLength)}`)
  }

  useEffect(() => {
    setDoPreventDefault(!isModalActive) // disable e.preventDefault() since we might be using wysiwyg editor which doesn't use textarea and need default browser behavior to ensure characters are being typed in contenteditable container. Ideally we should do e.preventDefault() only when either ctrl, cmd (meta) or alt key is pressed.

    if (!isModalActive && location) {
      if (enableWysiwyg) {
        const message = `/data merge block ${location.x} ${location.y} ${location.z} {Text1: ${text.current[0]},Text2:${text.current[1]},Text3:'{"text":"line 3"}',Text4:'{"text":"line 4"}'}`
        bot.chat(message)
        console.log('message sended')
      } else {
        bot._client.write('update_sign', {
          location,
          text1: text.current[0],
          text2: text.current[1],
          text3: text.current[2],
          text4: text.current[3]
        })
      }
    }
  }, [isModalActive])

  useMemo(() => {
    bot._client.on('open_sign_entity', (packet) => {
      if (!options.autoSignEditor) return
      setLocation(prev => packet.location)
      showModal({ reactType: 'signs-editor-screen' })
      if (options.wysiwygSignEditor === 'auto') {
        void isWysiwyg().then((value) => {
          setEnableWysiwyg(value)
        })
      } else if (options.wysiwygSignEditor === 'always') {
        setEnableWysiwyg(true)
      } else {
        setEnableWysiwyg(false)
      }
    })
  }, [])

  if (!isModalActive) return null
  return <SignEditor isWysiwyg={enableWysiwyg} handleInput={handleInput} handleClick={handleClick} />
}
