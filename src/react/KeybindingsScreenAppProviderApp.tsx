import { contro } from '../controls'
import KeybindingsScreen from './KeybindingsScreenApp'
import { useIsModalActive } from './utils'

export default () => {
    const isModalActive = useIsModalActive('keybindings')
    if (!isModalActive) return null

    const hasPsGamepad = Array.from(navigator.getGamepads?.() ?? []).some(gp => gp?.id.match(/playstation|dualsense|dualshock/i)) // todo: use last used gamepad detection
    return <KeybindingsScreen isPS={hasPsGamepad} contro={contro} resetBinding={() => {}} setBinding={(...args) => alert(args.map(arg => JSON.stringify(arg)).join(', '))} />
}
