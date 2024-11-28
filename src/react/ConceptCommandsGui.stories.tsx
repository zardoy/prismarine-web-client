
import type { Meta, StoryObj } from '@storybook/react'
import Button from './Button'

const defaultIcon = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 21H5H19H21V3H19H5H3V21ZM19 5V19H5V5H19ZM11 17H13V11H15V9H13V7H11V9H9V11H11V17ZM9 13V11H7V13H9ZM17 13H15V11H17V13Z" fill="currentColor" /></svg>

const Button2 = ({ title, icon }) => {
  //@ts-expect-error
  return <Button style={{ '--scale': 4 }}>
    <div style={{ fontSize: '22px', fontWeight: 'bold', display: 'flex', gap: 3, flexDirection: 'column', alignItems: 'center' }}>
      <div>
        {title}
      </div>
      <div style={{ width: 30, height: 30 }} className='full-svg'>
        {icon}
      </div>
    </div>
  </Button>
}

const Comp = () => {
  return <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10
  }}
  >
    <Button2 title="/give" icon={defaultIcon} />
    <Button2 title="/tell" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M4 2h18v16H6v2H4v-2h2v-2h14V4H4v18H2V2h2zm5 7H7v2h2V9zm2 0h2v2h-2V9zm6 0h-2v2h2V9z" fill="currentColor" /> </svg>} />
    <Button2 title="/setblock" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M2 2h20v20H2V2zm2 2v4h4V4H4zm6 0v4h4V4h-4zm6 0v4h4V4h-4zm4 6h-4v4h4v-4zm0 6h-4v4h4v-4zm-6 4v-4h-4v4h4zm-6 0v-4H4v4h4zm-4-6h4v-4H4v4zm6-4v4h4v-4h-4z" fill="currentColor" /> </svg>} />
    <Button2 title="/tp" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16 5H2v14h14v-2h2v-2h2v-2h2v-2h-2V9h-2V7h-2V5zm0 2v2h2v2h2v2h-2v2h-2v2H4V7h12z" fill="currentColor" /> </svg>} />
    <Button2 title="/clone" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M5 3H3v2h2V3zm2 4h2v2H7V7zm4 0h2v2h-2V7zm2 12h-2v2h2v-2zm2 0h2v2h-2v-2zm6 0h-2v2h2v-2zM7 11h2v2H7v-2zm14 0h-2v2h2v-2zm-2 4h2v2h-2v-2zM7 19h2v2H7v-2zM19 7h2v2h-2V7zM7 3h2v2H7V3zm2 12H7v2h2v-2zM3 7h2v2H3V7zm14 0h-2v2h2V7zM3 11h2v2H3v-2zm2 4H3v2h2v-2zm6-12h2v2h-2V3zm6 0h-2v2h2V3z" fill="currentColor" /> </svg>} />
    <Button2 title="/fill" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M21 3h-8v2h4v2h2v4h2V3zm-4 4h-2v2h-2v2h2V9h2V7zm-8 8h2v-2H9v2H7v2h2v-2zm-4-2v4h2v2H5h6v2H3v-8h2z" fill="currentColor" /> </svg>} />
    <Button2 title="/home" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M14 2h-4v2H8v2H6v2H4v2H2v2h2v10h7v-6h2v6h7V12h2v-2h-2V8h-2V6h-2V4h-2V2zm0 2v2h2v2h2v2h2v2h-2v8h-3v-6H9v6H6v-8H4v-2h2V8h2V6h2V4h4z" fill="currentColor" /> </svg>} />
    <Button2 title="/time" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"> <path d="M20 0h2v2h2v2h-2v2h-2V4h-2V2h2V0ZM8 4h8v2h-2v2h-2V6H8V4ZM6 8V6h2v2H6Zm0 8H4V8h2v8Zm2 2H6v-2h2v2Zm8 0v2H8v-2h8Zm2-2v2h-2v-2h2Zm-2-4v-2h2V8h2v8h-2v-4h-2Zm-4 0h4v2h-4v-2Zm0 0V8h-2v4h2Zm-8 6H2v2H0v2h2v2h2v-2h2v-2H4v-2Z" /> </svg>} />
    <Button2 title="/gamerule" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M4 5h16v2H4V5zm0 12H2V7h2v10zm16 0v2H4v-2h16zm0 0h2V7h-2v10zm-2-8h-4v6h4V9z" fill="currentColor" /> </svg>} />
    <Button2 title="/vanish" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M8 6h8v2H8V6zm-4 4V8h4v2H4zm-2 2v-2h2v2H2zm0 2v-2H0v2h2zm2 2H2v-2h2v2zm4 2H4v-2h4v2zm8 0v2H8v-2h8zm4-2v2h-4v-2h4zm2-2v2h-2v-2h2zm0-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0 0V8h-4v2h4zm-10 1h4v4h-4v-4z" fill="currentColor" /> </svg>} />
    <Button2 title="/clear" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4z" fill="currentColor" /> </svg>} />
    <Button2 title="/setspawnpoint" icon={<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M13 2v4h5v5h4v2h-4v5h-5v4h-2v-4H6v-5H2v-2h4V6h5V2h2zM8 8v8h8V8H8zm2 2h4v4h-4v-4z" fill="currentColor" /> </svg>} />
  </div>
}
const meta: Meta<any> = {
  component: Comp,
}

export default meta
type Story = StoryObj<any>

export const Primary: Story = {
  args: {
  },
}
