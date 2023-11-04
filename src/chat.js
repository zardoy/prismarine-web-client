//@ts-check
import { repeat } from 'lit/directives/repeat.js'
import { classMap } from 'lit/directives/class-map.js'
import { LitElement, html, css } from 'lit'
import { isCypress } from './utils'
import { getBuiltinCommandsList, tryHandleBuiltinCommand } from './builtinCommands'
import { options } from './optionsStorage'
import { activeModalStack, hideCurrentModal, showModal, miscUiState, notification } from './globalState'
import { formatMessage } from './botUtils'
import { getColorShadow, messageFormatStylesMap } from './react/MessageFormatted'



/**
 * @typedef {{parts: import('./botUtils').MessageFormatPart[], id, fading?, faded}} Message
 */

class ChatBox extends LitElement {
  static get styles () {
    return css`
        div.chat-wrapper { /* increase specificity */
            position: fixed;
            z-index: 10;
            padding-left: calc(env(safe-area-inset-left) / 2);
            padding-right: calc(env(safe-area-inset-right, 4px) / 2);
        }

        .chat-messages-wrapper {
            bottom: 40px;
            padding: 4px;
            padding-left: 0;
            max-height: var(--chatHeight);
            width: var(--chatWidth);
            transform-origin: bottom left;
            transform: scale(var(--chatScale));
            pointer-events: none;
        }

        .chat-input-wrapper {
            bottom: 1px;
            width: calc(100% - 3px);
            position: fixed;
            left: 1px;
            box-sizing: border-box;
            background-color: rgba(0, 0, 0, 0);
        }
        .chat-input {
          box-sizing: border-box;
          width: 100%;
        }
        .chat-completions {
          position: absolute;
          /* position this bottom on top of parent */
          top: 0;
          left: 0;
          transform: translateY(-100%);
          /* width: 150px; */
          display: flex;
          padding: 0 2px; // input padding
          width: 100%;
        }
        .input-mobile .chat-completions {
          transform: none;
          top: 15px; // input height
        }
        .chat-completions-pad-text {
          pointer-events: none;
          white-space: pre;
          opacity: 0;
          overflow: hidden;
        }
        .chat-completions-items {
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          /* justify-content: flex-end; */
          /* probably would be better to replace with margin, not sure */
          padding: 2px;
          max-height: 100px;
          overflow: auto;
          /* hide ugly scrollbars in firefox */
          scrollbar-width: none;
        }
        /* unsupported by firefox */
        ::-webkit-scrollbar {
            width: 5px;
            background-color: rgb(24, 24, 24);
        }
        ::-webkit-scrollbar-thumb {
            background-color: rgb(50, 50, 50);
        }
        .chat-completions-items > div {
          cursor: pointer;
        }
        .chat-completions-items > div:hover {
          text-shadow: 0px 0px 6px white;
        }
        .input-mobile .chat-completions-items {
          justify-content: flex-start;
        }

        .input-mobile {
          top: 1px;
        }
        .input-mobile #chatinput {
          height: 20px;
        }

        .display-mobile {
          top: 40px;
        }

        .chat, .chat-input {
            color: white;
            font-size: 10px;
            margin: 0px;
            line-height: 100%;
            text-shadow: 1px 1px 0px #3f3f3f;
            font-family: mojangles, minecraft, monospace;
            max-height: var(--chatHeight);
        }
        .chat {
          pointer-events: none;
          overflow: hidden;
          width: 100%;
          scrollbar-width: thin;
        }
        .chat.opened {
            pointer-events: auto;
            overflow-y: auto;
        }

        input[type=text], #chatinput {
            background-color: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 0, 0, 0);
            outline: none;
            pointer-events: auto;
            /* styles reset */
            padding-top: 1px;
            padding-bottom: 1px;
            padding-left: 2px;
            padding-right: 2px;
            height: 15px;
        }

        .chat-mobile-hidden {
          width: 8px;
          height: 0;
          position: absolute;
          display: block !important;
          opacity: 0;
          pointer-events: none;
        }
        .chat-mobile-hidden:nth-last-child(1) {
          height: 8px;
        }

        #chatinput:focus {
          border-color: white;
        }

        .chat-message {
            padding-left: 4px;
            background-color: rgba(0, 0, 0, 0.5);
            list-style: none;
            word-break: break-all;
        }

        .chat-message-fadeout {
            opacity: 1;
            transition: all 3s;
        }

        .chat-message-fade {
            opacity: 0;
        }

        .chat-message-faded {
            transition: none !important;
        }

        .chat.opened .chat-message {
            opacity: 1 !important;
            transition: none !important;
        }

        .chat-message-part {
        }
    `
  }

  static get properties () {
    return {
      messages: {
        type: Array
      },
      completionItems: {
        type: Array
      },
      completePadText: {
        type: String
      }
    }
  }

  constructor () {
    super()
    this.chatHistoryPos = 0
    this.chatHistory = JSON.parse(window.sessionStorage.chatHistory || '[]')
    this.completePadText = ''
    this.messagesLimit = 200
    /** @type {string[]} */
    this.completionItemsSource = []
    /** @type {string[]} */
    this.completionItems = []
    this.completeRequestValue = ''
    /** @type {Message[]} */
    this.messages = [{
      parts: [
        {
          text: 'Welcome to prismarine-web-client! Chat appears here.',
        }
      ],
      id: 0,
      fading: true,
      faded: true,
    }]
  }

  enableChat (initialText = '') {
    if (this.inChat) {
      hideCurrentModal()
      return
    }

    notification.show = false
    // @ts-expect-error
    const chat = this.shadowRoot.getElementById('chat-messages')
    /** @type {HTMLInputElement} */
    // @ts-expect-error
    const chatInput = this.shadowRoot.getElementById('chatinput')

    showModal(this)

    // Show extended chat history
    chat.style.maxHeight = 'var(--chatHeight)'
    chat.scrollTop = chat.scrollHeight // Stay bottom of the list
    // handle / and other snippets
    this.updateInputValue(initialText)
    this.chatHistoryPos = this.chatHistory.length
    // to show
    this.requestUpdate()
    setTimeout(() => {
      // after component update display
      chatInput.focus()
    })
  }

  get inChat () {
    return activeModalStack.some(m => m.elem === this)
  }

  /**
   * @param {import('minecraft-protocol').Client} client
   */
  init (client) {
    // @ts-expect-error
    const chat = this.shadowRoot.getElementById('chat-messages')
    /** @type {HTMLInputElement} */
    // @ts-expect-error
    const chatInput = this.shadowRoot.getElementById('chatinput')
    /** @type {any} */
    this.chatInput = chatInput

    // Show chat
    chat.style.display = 'block'

    let savedCurrentValue
    // Chat events
    document.addEventListener('keydown', e => {
      if (activeModalStack.at(-1)?.elem !== this) return
      if (e.code === 'ArrowUp') {
        if (this.chatHistoryPos === 0) return
        if (this.chatHistoryPos === this.chatHistory.length) {
          savedCurrentValue = chatInput.value
        }
        this.updateInputValue(this.chatHistory[--this.chatHistoryPos] || '')
      } else if (e.code === 'ArrowDown') {
        if (this.chatHistoryPos === this.chatHistory.length) return
        this.updateInputValue(this.chatHistory[++this.chatHistoryPos] || savedCurrentValue || '')
      }
    })

    document.addEventListener('keypress', e => {
      if (!this.inChat && activeModalStack.length === 0) {
        return false
      }

      if (!this.inChat) return

      e.stopPropagation()

      if (e.code === 'Enter') {
        const message = chatInput.value
        if (message) {
          this.chatHistory.push(message)
          window.sessionStorage.chatHistory = JSON.stringify(this.chatHistory)
          const builtinHandled = tryHandleBuiltinCommand(message)
          if (!builtinHandled) {
            bot.chat(message)
          }
        }
        hideCurrentModal()
      }
    })

    this.hide = () => {
      this.completionItems = []
      // Clear chat input
      chatInput.value = ''
      // Unfocus it
      chatInput.blur()
      // Hide extended chat history
      chat.style.maxHeight = 'var(--chatHeight)'
      chat.scrollTop = chat.scrollHeight // Stay bottom of the list
      this.requestUpdate()
      return 'custom' // custom hide
    }
    this.hide()

    bot.on('message', (fullmessage) => {
      const parts = formatMessage(fullmessage)

      const lastId = this.messages.at(-1)?.id ?? 0
      this.messages = [...this.messages.slice(-this.messagesLimit), {
        parts,
        id: lastId + 1,
        fading: false,
        faded: false
      }]
      /** @type {any} */
      const message = this.messages.at(-1)

      chat.scrollTop = chat.scrollHeight // Stay bottom of the list
      // fading
      setTimeout(() => {
        message.fading = true
        this.requestUpdate()
        setTimeout(() => {
          message.faded = true
          this.requestUpdate()
        }, 3000)
      }, 5000)
    })
    // todo support hover content below, {action: 'show_text', contents: {text}}, and some other types
    // todo remove
    window.dummyMessage = () => {
      client.emit('chat', {
        message: '{"color":"yellow","translate":"multiplayer.player.joined","with":[{"insertion":"pviewer672","clickEvent":{"action":"suggest_command","value":"/tell pviewer672 "},"hoverEvent":{"action":"show_entity","contents":{"type":"minecraft:player","id":"ecd0eeb1-625e-3fea-b16e-cb449dcfa434","name":{"text":"pviewer672"}}},"text":"pviewer672"}]}',
        position: 1,
        sender: '00000000-0000-0000-0000-000000000000',
      })
    }
    // window.dummyMessage()

    chatInput.addEventListener('input', (e) => {
      const completeValue = this.getCompleteValue()
      this.completePadText = completeValue === '/' ? '' : completeValue
      if (this.completeRequestValue === completeValue) {
        /** @type {any} */
        const lastWord = chatInput.value.split(' ').at(-1)
        this.completionItems = this.completionItemsSource.filter(i => {
          const compareableParts = i.split(/[_:]/)
          return compareableParts.some(compareablePart => compareablePart.startsWith(lastWord))
        })
        return
      }
      this.completeRequestValue = ''
      this.completionItems = []
      this.completionItemsSource = []
      if (options.autoRequestCompletions && this.getCompleteValue() === '/') {
        void this.fetchCompletion()
      }
    })
    chatInput.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        if (this.completionItems.length) {
          this.acceptComplete(this.completionItems[0])
        } else {
          void this.fetchCompletion(chatInput.value)
        }
        e.preventDefault()
      }
      if (e.code === 'Space' && options.autoRequestCompletions && chatInput.value.startsWith('/')) {
        // alternative we could just simply use keyup, but only with keydown we can display suggestions popup as soon as possible
        void this.fetchCompletion(this.getCompleteValue(chatInput.value + ' '))
      }
    })
  }

  getCompleteValue (value = this.chatInput.value) {
    const valueParts = value.split(' ')
    const lastLength = valueParts.at(-1).length
    const completeValue = lastLength ? value.slice(0, -lastLength) : value
    if (valueParts.length === 1 && value.startsWith('/')) return '/'
    return completeValue
  }

  async fetchCompletion (value = this.getCompleteValue()) {
    this.completionItemsSource = []
    this.completionItems = []
    this.completeRequestValue = value
    let items = await bot.tabComplete(value, true, true)
    if (typeof items[0] === 'object') {
      // @ts-expect-error
      if (items[0].match) items = items.map(i => i.match)
    }
    if (value !== this.completeRequestValue) return
    if (this.completeRequestValue === '/') {
      if (!items[0].startsWith('/')) {
        // normalize
        items = items.map(item => `/${item}`)
      }
      if (localServer) {
        items = [...items, ...getBuiltinCommandsList()]
      }
    }
    this.completionItems = items
    this.completionItemsSource = items
  }

  renderMessagePart (/** @type {import('./botUtils').MessageFormatPart} */{ bold, color, italic, strikethrough, text, underlined }) {
    const colorF = (color) => {
      return color.trim().startsWith('#') ? `color:${color}` : messageFormatStylesMap[color] ?? undefined
    }

    /** @type {string[]} */
    // @ts-expect-error
    const applyStyles = [
      color ? colorF(color.toLowerCase()) + `; text-shadow: 1px 1px 0px ${getColorShadow(colorF(color.toLowerCase()).replace('color:', ''))}` : messageFormatStylesMap.white,
      italic && messageFormatStylesMap.italic,
      bold && messageFormatStylesMap.bold,
      italic && messageFormatStylesMap.italic,
      underlined && messageFormatStylesMap.underlined,
      strikethrough && messageFormatStylesMap.strikethrough
    ].filter(Boolean)

    return html`
      <span
        class="chat-message-part"
        style="${applyStyles.join(';')}"
      >${text}</span>
    `
  }

  renderMessage (/** @type {Message} */message) {
    const classes = {
      'chat-message-fadeout': message.fading,
      'chat-message-fade': message.fading,
      'chat-message-faded': message.faded,
      'chat-message': true
    }

    return html`
      <li class=${classMap(classes)}>
        ${message.parts.map(msg => this.renderMessagePart(msg))}
      </li>
    `
  }

  updateInputValue (value) {
    /** @type {any} */
    const { chatInput } = this
    chatInput.value = value
    chatInput.dispatchEvent(new Event('input'))
    setTimeout(() => {
      chatInput.setSelectionRange(value.length, value.length)
    }, 0)
  }

  auxInputFocus (fireKey) {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: fireKey }))
    this.chatInput.focus()
  }

  acceptComplete (item) {
    const base = this.completeRequestValue === '/' ? '' : this.getCompleteValue()
    this.updateInputValue(base + item)
    // would be cool but disabled because some comands don't need args (like ping)
    // // trigger next tab complete
    // this.chatInput.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    this.chatInput.focus()

  }

  render () {

    return html`
      <div class="chat-wrapper chat-messages-wrapper ${miscUiState.currentTouch ? 'display-mobile' : ''}">
        <div class="chat ${this.inChat ? 'opened' : ''}" id="chat-messages">
          <!-- its to hide player joined at random timings, todo add chat tests as well -->
          ${repeat(isCypress() ? [] : this.messages, (m) => m.id, (m) => this.renderMessage(m))}
        </div>
      </div>
      <div class="chat-wrapper chat-input-wrapper ${miscUiState.currentTouch ? 'input-mobile' : ''}" style="display: ${this.inChat ? 'block' : 'none'}">
        <div class="chat-input">
          ${this.completionItems.length ? html`
            <div class="chat-completions">
                      <div class="chat-completions-pad-text">${this.completePadText}</div>
                      <div class="chat-completions-items">
                        ${repeat(this.completionItems, (i) => i, (i) => html`<div @click=${() => this.acceptComplete(i)}>${i}</div>`)}
                      </div>
                    </div>
          ` : ''}
          <input type="text" class="chat-mobile-hidden" id="chatinput-next-command" spellcheck="false" autocomplete="off" @focus=${() => {
      this.auxInputFocus('ArrowUp')
    }}></input>
          <input type="text" class="chat-input" id="chatinput" spellcheck="false" autocomplete="off" aria-autocomplete="both"></input>
          <input type="text" class="chat-mobile-hidden" id="chatinput-prev-command" spellcheck="false" autocomplete="off" @focus=${() => {
      this.auxInputFocus('ArrowDown')
    }}></input>
        </div>
      </div>
    `
  }
}

window.customElements.define('chat-box', ChatBox)
