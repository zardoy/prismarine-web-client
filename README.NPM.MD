# Minecraft React

Minecraft UI components for React extracted from [mcraft.fun](https://mcraft.fun) project.

```bash
pnpm i minecraft-react
```

![demo](https://github-production-user-asset-6210df.s3.amazonaws.com/46503702/346295584-80f3ed4a-cab6-45d2-8896-5e20233cc9b1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20240706%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240706T195400Z&X-Amz-Expires=300&X-Amz-Signature=5b063823a57057c4042c15edd1db3edd107e00940fd0e66a2ba1df4e564a2809&X-Amz-SignedHeaders=host&actor_id=46503702&key_id=0&repo_id=432411890)

## Usage

```jsx
import { Scoreboard } from 'minecraft-react'

const App = () => {
  return (
    <Scoreboard
      open
      title="Scoreboard"
      items={[
        { name: 'Player 1', value: 10 },
        { name: 'Player 2', value: 20 },
        { name: 'Player 3', value: 30 },
      ]}
    />
  )
}
```

See [Storybook](https://mcraft.fun/storybook/) or [Storybook (Mirror link)](https://mcon.vercel.app/storybook/) for more examples and full components list. Also take a look at the full [standalone example](https://github.com/zardoy/minecraft-web-client/tree/experiments/UiStandaloneExample.tsx).

There are two types of components:

- Small UI components or HUD components
- Full screen components (like sign editor, worlds selector)
