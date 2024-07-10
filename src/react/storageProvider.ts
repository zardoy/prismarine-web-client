import { CustomCommand } from './KeybindingsCustom'

type StorageData = {
  customCommands: Record<string, CustomCommand>
  // ...
}

export const getStoredValue = <T extends keyof StorageData> (name: T): StorageData[T] | undefined => {
  return localStorage[name] ? JSON.parse(localStorage[name]) : undefined
}
export const setStoredValue = <T extends keyof StorageData> (name: T, value: StorageData[T]) => {
  localStorage[name] = JSON.stringify(value)
}
