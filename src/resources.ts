import latest_gui_title_minecraft from 'mc-assets/dist/other-textures/latest/gui/title/minecraft.png'
import other_textures_1_19_gui_icons from 'mc-assets/dist/other-textures/1.19/gui/icons.png'
import other_textures_latest_gui_widgets from 'mc-assets/dist/other-textures/latest/gui/widgets.png'
import other_textures_latest_gui_bars from 'mc-assets/dist/other-textures/latest/gui/bars.png'

export const appReplacableResources = {
  'latest_gui_title_minecraft': {
    content: latest_gui_title_minecraft,
    ...{"cssVar":"--title-gui"}
  },

  'other_textures_1_19_gui_icons': {
    content: other_textures_1_19_gui_icons,
    ...{"cssVar":"--gui-icons","cssVarRepeat":2}
  },

  'other_textures_latest_gui_widgets': {
    content: other_textures_latest_gui_widgets,
    ...{"cssVar":"--widgets-gui-atlas"}
  },

  'other_textures_latest_gui_bars': {
    content: other_textures_latest_gui_bars,
    ...{"cssVar":"--bars-gui-atlas"}
  },
}