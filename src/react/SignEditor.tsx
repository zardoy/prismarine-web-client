import { useEffect, useRef } from 'react'
import markdownToFormattedText from '../markdownToFormattedText'
import { ProseMirrorView } from './prosemirror-markdown'
import Button from './Button'
import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import './SignEditor.css'


const imageSource = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAABbElEQVR4AY3BQY6cMBBA0Q+yQZZVi+ndcJVcKGfMgegdvShKVtuokzGSWwwiUd7rfv388Vst0UgMXCobmgsSA5VaQmKgUks0EgNHji8SA9W8GJCQwVNpLhzJ4KFs4B1HEgPVvBiQkMFTaS44tYTEQDXdIkfiHbuyobmguaDPFzIWGrWExEA13SJH4h1uzS/WbPyvroM1v6jWbFRrNv7GfX5EdmXjzTvUEjJ4zjQXjiQGdmXjzTvUEjJ4HF/UEt/kQqW5UEkMzIshY08jg6dRS3yTC5XmgpsXY7pFztQSEgPNJCNv3lGpJVSfTLfImVpCYsB1HdwfxpU1G9eeNF0H94dxZc2G+/yI7MoG3vEv82LI2NNIDLyVDbzjzFE2mnkxZOy5IoNnkpFGc2FXNpp5MWTsOXJ4h1qikrGnkhjYlY1m1icy9lQSA+TCzjvUEpWMPZXEwK5suPvDOFuzcdZ1sOYX1ZqNas3GlTUbzR+jQbEAcs8ZQAAAAABJRU5ErkJggg=='

type Props = {
  handleInput: (target: HTMLInputElement) => void,
  isWysiwyg: boolean,
  handleClick?: (view: ResultType) => void
}

export type ResultType = {
  plainText: string[]
} | {
  dataText: string[]
}

export default ({ handleInput, isWysiwyg, handleClick }: Props) => {
  const prosemirrorContainer = useRef(null)
  const currentInputIndex = useRef(0)
  const editorView = useRef<ProseMirrorView | null>(null)

  const highlightCurrentInput = (inputs: HTMLCollectionOf<HTMLInputElement>) => {
    const inputsArray = Array.from(inputs)
    for (const [index, input] of inputsArray.entries()) {
      if (index === currentInputIndex.current) {
        input.classList.add('selected')
        input.focus()
      } else {
        input.classList.remove('selected')
      }
    }
  }

  useEffect(() => {
    if (isWysiwyg) {
      editorView.current = new ProseMirrorView(prosemirrorContainer.current, '')
    }
  }, [isWysiwyg])

  useEffect(() => {
    const inputs = document.getElementsByClassName('sign-editor') as HTMLCollectionOf<HTMLInputElement>
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        currentInputIndex.current = Math.max(currentInputIndex.current - 1, 0)
        highlightCurrentInput(inputs)
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        currentInputIndex.current = Math.min(currentInputIndex.current + 1, inputs.length - 1)
        highlightCurrentInput(inputs)
      } 
    })
  }, [])

  return <div className='signs-editor-container'>
    <div className='signs-editor-inner-container'>
      <img className='signs-editor-bg-image' src={imageSource} alt='' />
      {isWysiwyg ? (
        <p ref={prosemirrorContainer} className='wysiwyg-editor'></p>
      ) : [1, 2, 3, 4].map((value, index) => {
        return <input className='sign-editor' key={index} data-key={index} maxLength={15} onInput={(e) => {
          handleInput(e.currentTarget)
        }} />
      })
      }
      <Button onClick={async () => {
        if (handleClick) {
          if (isWysiwyg) {
            const text = markdownToFormattedText(editorView.current!.content)
            handleClick({ dataText: text })
          } else {
            const text = [] as string[]
            for (const input of document.getElementsByClassName('sign-editor')) {
              text.push((input as HTMLInputElement).value)
            }
            handleClick({ plainText: text })
          }
        }
      }} className='sign-editor-button' label={'Done'} />
    </div>
  </div>
}
