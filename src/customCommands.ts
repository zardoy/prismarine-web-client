import { guiOptionsScheme, tryFindOptionConfig } from './optionsGuiScheme'
import { options } from './optionsStorage'

export const customCommandsConfig = {
  chat: {
    input: [
      {
        type: 'text',
        placeholder: 'Command to send e.g. gamemode creative'
      }
    ],
    handler ([command]) {
      bot.chat(`/${command.replace(/^\//, '')}`)
    }
  },
  setOrToggleSetting: {
    input: [
      {
        type: 'select',
        // maybe title case?
        options: Object.keys(options)
      },
      {
        type: 'select',
        options: ['toggle', 'set']
      },
      ([setting = '', action = ''] = []) => {
        const value = options[setting]
        if (!action || value === undefined || action === 'toggle') return null
        if (action === 'set') {
          const getBase = () => {
            const config = tryFindOptionConfig(setting as any)
            if (config && 'values' in config) {
              return {
                type: 'select',
                options: config.values
              }
            }
            if (config?.type === 'toggle' || typeof value === 'boolean') {
              return {
                type: 'select',
                options: ['true', 'false']
              }
            }
            if (config?.type === 'slider' || value.type === 'number') {
              return {
                type: 'number',
              }
            }
            return {
              type: 'text'
            }
          }
          return {
            ...getBase(),
            placeholder: value
          }
        }
      }
    ],
    handler ([setting, action, value]) {
      if (action === 'toggle' || action === undefined) {
        const value = options[setting]
        const config = tryFindOptionConfig(setting)
        if (config && 'values' in config && config.values) {
          const { values } = config
          const currentIndex = values.indexOf(value)
          const nextIndex = (currentIndex + 1) % values.length
          options[setting] = values[nextIndex]
        } else {
          options[setting] = typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : value
        }
      } else {
        options[setting] = value
      }
    }
  },
  jsScripts: {
    input: [
      {
        type: 'text',
        placeholder: 'JavaScript code to run in main thread (sensitive!)'
      }
    ],
    handler ([code]) {
      // eslint-disable-next-line no-new-func -- this is a feature, not a bug
      new Function(code)()
    }
  },
  // openCommandsScreen: {}
}
