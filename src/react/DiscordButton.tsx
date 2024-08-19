import { useFloating, arrow, FloatingArrow, offset as offsetMiddleware, Placement, autoPlacement } from '@floating-ui/react'
import { openURL } from 'prismarine-viewer/viewer/lib/simpleUtils'
import { CSSProperties, useState } from 'react'
import Button from './Button'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

export const DiscordButton = () => {
  const links: DropdownButtonItem[] = [
    {
      text: 'Support Official Server (mcraft.fun)',
      clickHandler: () => openURL('https://discord.gg/xzGRhxtRUt')
    },
    {
      text: 'Community Server (PrismarineJS)',
      clickHandler: () => openURL('https://discord.gg/4Ucm684Fq3')
    }
  ]

  return <DropdownButton text="Discord" links={links} />
}

export type DropdownButtonItem = {
  text: string,
  clickHandler: () => void
}

export const DropdownButton = ({ text, links }: { text: string, links: DropdownButtonItem[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      autoPlacement()
    ],
  })

  const styles: CSSProperties = {
    ...floatingStyles,
    background: 'rgba(0, 0, 0, 0.3)',
    fontSize: 8,
    userSelect: 'text',
    padding: '2px 4px',
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out',
    textShadow: '1px 1px 2px BLACK',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 11
  }

  return <>
    <Button
      style={{ position: 'relative', width: '98px' }}
      rootRef={refs.setReference}
      onClick={() => {
        setIsOpen(!isOpen)
      }}
    >{text}<PixelartIcon
        styles={{ position: 'absolute', top: '5px', right: '5px' }}
        iconName={isOpen ? pixelartIcons['chevron-up'] : pixelartIcons['chevron-down']}
      />
    </Button>
    {
      isOpen && <div ref={refs.setFloating} style={styles}>
        {links.map(el => {
          return <Button
            key={el.text}
            style={{ width: '98px', fontSize: '7px' }}
            onClick={el.clickHandler}
          >{el.text}
          </Button>
        })}
      </div>
    }
  </>
}
