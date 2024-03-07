import './Scoreboard.css'
import MessageFormattedString from './MessageFormattedString'


export type ScoreboardItems = Array<{name: string, value: number, displayName?: any}>

type ScoreboardProps = {
  title: string,
  items: ScoreboardItems,
  open: boolean
}

export default function Scoreboard ({ title, items, open }: ScoreboardProps) {

  if (!open) return null
  return (
    <div className='scoreboard-container'>
      <div className='scoreboard-title'>
        <MessageFormattedString message={title} />
      </div>
      {
        items.map((item, index) => {
          return(
            <div key={index} className='item-container'>
              <div className='item-name'>
                <MessageFormattedString message={item.displayName ?? item.name} />
              </div>
              <div className='item-value'>
                {item.value}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}
