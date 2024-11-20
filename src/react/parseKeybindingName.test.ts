import { test, expect } from 'vitest'
import { parseBindingName } from './parseKeybindingName'

test('display keybinding correctly', async () => {
  expect(await parseBindingName('unknown')).toMatchInlineSnapshot('"unknown"')
  expect(await parseBindingName('KeyT')).toMatchInlineSnapshot('"T"')
  expect(await parseBindingName('Digit1')).toMatchInlineSnapshot('"1"')
  expect(await parseBindingName('Numpad1')).toMatchInlineSnapshot('"Numpad 1"')
  expect(await parseBindingName('MetaLeft')).toMatchInlineSnapshot('"Left Meta"')
  expect(await parseBindingName('Space')).toMatchInlineSnapshot('"Space"')
  expect(await parseBindingName('Escape')).toMatchInlineSnapshot('"Escape"')
  expect(await parseBindingName('F11')).toMatchInlineSnapshot('"F11"')
  expect(await parseBindingName('Mouse 55')).toMatchInlineSnapshot('"Mouse 55"')
})
