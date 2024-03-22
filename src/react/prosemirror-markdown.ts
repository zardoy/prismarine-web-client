import { EditorView } from 'prosemirror-view'
import { EditorState } from 'prosemirror-state'
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown'
import { exampleSetup, buildMenuItems } from 'prosemirror-example-setup'
import { MarkSpec } from 'prosemirror-model'
import { toggleMark } from 'prosemirror-commands'

export class ProseMirrorView {
  view

  constructor(target, content) {
    const emDOM: DOMOutputSpec = ["em", 0], strongDOM: DOMOutputSpec = ["strong", 0], codeDOM: DOMOutputSpec = ["code", 0]
    
    const marks = {
      /// A link. Has `href` and `title` attributes. `title`
      /// defaults to the empty string. Rendered and parsed as an `<a>`
      /// element.
      link: {
        attrs: {
          href: {},
          title: { default: null }
        },
        inclusive: false,
        parseDOM: [{
          tag: 'a[href]', getAttrs (dom: HTMLElement) {
            return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
          }
        }],
        toDOM (node) { const { href, title } = node.attrs; return ['a', { href, title }, 0] }
      } as MarkSpec,

      /// An emphasis mark. Rendered as an `<em>` element. Has parse rules
      /// that also match `<i>` and `font-style: italic`.
      em: {
        parseDOM: [
          { tag: 'i' }, { tag: 'em' },
          { style: 'font-style=italic' },
          { style: 'font-style=normal', clearMark: m => m.type.name === 'em' }
        ],
        toDOM () { return emDOM }
      } as MarkSpec,

      /// A strong mark. Rendered as `<strong>`, parse rules also match
      /// `<b>` and `font-weight: bold`.
      strong: {
        parseDOM: [
          { tag: 'strong' },
          // This works around a Google Docs misbehavior where
          // pasted content will be inexplicably wrapped in `<b>`
          // tags with a font-weight normal.
          { tag: 'b', getAttrs: (node: HTMLElement) => node.style.fontWeight != 'normal' && null },
          { style: 'font-weight=400', clearMark: m => m.type.name === 'strong' },
          { style: 'font-weight', getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
        ],
        toDOM () { return strongDOM }
      } as MarkSpec,
      
      // /// Code font mark. Represented as a `<code>` element.
      // code: {
      //   parseDOM: [{ tag: 'code' }],
      //   toDOM () { return codeDOM }
      // } as MarkSpec
    }


    console.log('schema.marks', schema.marks)
    //@ts-expect-error
    schema.marks.textColor = {
      spec: {
        attrs: { color: {} },
        inline: true,
        parseDOM: [
          {
            style: 'color',
            getAttrs: value => ({ color: value })
          }
        ],
        toDOM: mark => ['span', { style: `color: ${mark.attrs.color}` }, 0]
      },
    }

    const fullMenu = buildMenuItems(schema).fullMenu as Array<Array<import('prosemirror-menu').MenuItem>>
    fullMenu[0] = fullMenu[0].filter(item => item.spec.title !== 'Add or remove link' && item.spec.title !== 'Toggle code font')
    fullMenu.splice(3, 1); // remove the insert list, quote & checkbox menu
    (fullMenu[1][0] as any).options.label = 'Color' // check-build error: fullMenu[1][0].options.label = 'Color'
    fullMenu[1][0].content[0].spec.label = 'Red'
    fullMenu[1][0].content[0].spec.run = (state, dispatch, view) => {
      // console.log('state', state)
      // // make <p style="color: red">...</p>
      // const { from, to } = state.selection
      // const { tr } = state
      // console.log(schema.marks)
      // tr.addMark(from, to, schema.marks.textColor.create({ color: 'red' }))
      // dispatch(tr)
      toggleMark(schema.marks.textColor, { color: 'red' })(state, dispatch, view)
    }
    fullMenu[1].splice(1, 1) // remove the type menu
    console.log('fullMenu', fullMenu)
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
          autofocus: 'true',
        }
      },
    })
  }

  get content () {
    const content = defaultMarkdownSerializer.serialize(this.view.state.doc)
    console.log('content', content)
    return content
  }

  focus () {
    this.view.focus()
  }

  destroy () {
    this.view.destroy()
  }
}
