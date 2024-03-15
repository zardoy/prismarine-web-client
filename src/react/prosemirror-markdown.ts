import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown'
import { exampleSetup, buildMenuItems } from 'prosemirror-example-setup'

export class ProseMirrorView {
  view

  constructor (target, content) {
    const fullMenu = buildMenuItems(schema).fullMenu as Array<Array<import('prosemirror-menu').MenuItem>>
    fullMenu[0] = fullMenu[0].filter(item => item.spec.title !== 'Add or remove link' && item.spec.title !== 'Toggle code font')
    fullMenu.splice(3, 1) // remove the insert list, quote & checkbox menu
    // fullMenu[1][0].options.label = 'Color' check-build error: fullMenu[1][0].options.label = 'Color'
    // fullMenu[1][0].content // replace with colors
    fullMenu[1].splice(1, 1) // remove the type menu
    this.view = new EditorView(target, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(content) ?? undefined,
        plugins: exampleSetup({
          schema,
          menuContent: fullMenu,
        }),
      }),
      attributes (state) {
        return {
          autocorrect: 'off',
          autocapitalize: 'off',
          spellcheck: 'false',
        }
      },
    })
  }

  get content () {
    return defaultMarkdownSerializer.serialize(this.view.state.doc)
  }

  focus () {
    this.view.focus()
  }

  destroy () {
    this.view.destroy()
  }
}

