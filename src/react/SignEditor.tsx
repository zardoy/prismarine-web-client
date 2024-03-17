import { useEffect, useRef } from 'react'
import { MessageFormatPart } from '../botUtils'
import { ProseMirrorView } from './prosemirror-markdown'
import Button from './Button'
import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import './SignEditor.css'


const imageSource = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAABbElEQVR4AY3BQY6cMBBA0Q+yQZZVi+ndcJVcKGfMgegdvShKVtuokzGSWwwiUd7rfv388Vst0UgMXCobmgsSA5VaQmKgUks0EgNHji8SA9W8GJCQwVNpLhzJ4KFs4B1HEgPVvBiQkMFTaS44tYTEQDXdIkfiHbuyobmguaDPFzIWGrWExEA13SJH4h1uzS/WbPyvroM1v6jWbFRrNv7GfX5EdmXjzTvUEjJ4zjQXjiQGdmXjzTvUEjJ4HF/UEt/kQqW5UEkMzIshY08jg6dRS3yTC5XmgpsXY7pFztQSEgPNJCNv3lGpJVSfTLfImVpCYsB1HdwfxpU1G9eeNF0H94dxZc2G+/yI7MoG3vEv82LI2NNIDLyVDbzjzFE2mnkxZOy5IoNnkpFGc2FXNpp5MWTsOXJ4h1qikrGnkhjYlY1m1icy9lQSA+TCzjvUEpWMPZXEwK5suPvDOFuzcdZ1sOYX1ZqNas3GlTUbzR+jQbEAcs8ZQAAAAABJRU5ErkJggg=='

type Props = {
  handleInput: (target: HTMLInputElement) => void,
  isWysiwyg: boolean,
  handleClick?: () => void
}

export default ({ handleInput, isWysiwyg, handleClick }: Props) => {
  const ref = useRef(null)
  const mount = useRef(false)

  useEffect(() => {
    if (ref.current && !mount.current) {
      mount.current = true
      const view = new ProseMirrorView(ref.current, '')
    }
  }, [ref.current])

  return <div className='signs-editor-container'>
    <div className='signs-editor-inner-container'>
      <img className='signs-editor-bg-image' src={imageSource} alt='' />
      {isWysiwyg ? (
        <p ref={ref} id='formatted_sign_editor' className='wysiwyg-editor'></p>
      ) : [1, 2, 3, 4].map((value, index) => {
        return <input className='sign-editor' key={index} data-key={index} maxLength={15} onInput={(e) => {
          handleInput(e.currentTarget)
        }} />
      })
      }
      <Button onClick={handleClick} className='sign-editor-button' label={'Done'} />
    </div>
  </div>
}
