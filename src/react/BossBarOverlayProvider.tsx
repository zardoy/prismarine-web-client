import { useState, useEffect } from 'react'
import BossBar, { BossBarType } from './BossBarOverlay'
import './BossBarOverlay.css'


export default () => {
  const [bossBars, setBossBars] = useState(new Map<string, BossBarType>())

  useEffect(() => {
    bot.on('bossBarCreated', (bossBar) => {
      setBossBars(prevBossBars => new Map(prevBossBars.set(bossBar.entityUUID, bossBar as any)))
    })
    bot.on('bossBarUpdated', (bossBar) => {
      setBossBars(prevBossBars => new Map(prevBossBars.set(bossBar.entityUUID, bossBar as BossBarType)))
    })
    bot.on('bossBarDeleted', (bossBar) => {
      const newBossBars = new Map(bossBars)
      newBossBars.delete(bossBar.entityUUID)
      setBossBars(newBossBars)
    })
  }, [])

  return (
    <div className="bossBars" id="bossBars">
      {[...bossBars.values()].map(bar => (
        <BossBar key={bar.entityUUID} bar={bar} />
      ))}
    </div>
  )
}
