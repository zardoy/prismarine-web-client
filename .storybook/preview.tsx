import React from 'react'

import type { Preview } from "@storybook/react";

import '../src/styles.css'
import './storybook.css'

const preview: Preview = {
  decorators: [
    (Story) => (
      <div id='ui-root'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
