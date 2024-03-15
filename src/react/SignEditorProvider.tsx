import { useMemo, useEffect, useState } from 'react'
import { showModal } from '../globalState'
import { useIsModalActive } from './utils'
import SignEditor from './SignEditor'


export default () => {
  const [location, setLocation] = useState<{x: number, y: number, z: number} | null>(null)
  const [text, setText] = useState<string | string[]>('')
  const isModalActive = useIsModalActive('signs-editor-screen')

  const handleInput = (text: string) => {
    if (text.length > 22 || text.includes('\n')) {
      const lines = text.split('\n')
      const result: string[] = []
      for (const line of lines) {
        let startIndex = 0
        while (startIndex < line.length) {
          if (startIndex + 22 < line.length) {
            result.push(line.slice(startIndex, startIndex + 22))
          } else {
            result.push(line.slice(startIndex))
          }
          startIndex += 22
        }
      }
      setText(result)
    } else {
      setText(text)
    }
  }

  useEffect(() => {
    if (!isModalActive) {
      if (location) {
        console.log(location)
        bot._client.write('update_sign', {
          location,
          text1: typeof text === 'string' ? text : text[0] ?? '',
          text2: typeof text === 'string' ? '' : text[1] ?? '',
          text3: typeof text === 'string' ? '' : text[2] ?? '',
          text4: typeof text === 'string' ? '' : text[3] ?? ''
        })
      }
    }
  }, [isModalActive])

  useMemo(() => {
    bot._client.on('open_sign_entity', (packet) => {
      setLocation(prev => packet.location)
      showModal({ reactType: 'signs-editor-screen' })
    })
  }, [])

  if (!isModalActive) return null
  return <SignEditor isWysiwyg={false} handleInput={handleInput} />
}
