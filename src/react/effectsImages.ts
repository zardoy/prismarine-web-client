import absorption from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/absorption.png'
import glowing from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/glowing.png'
import instant_health from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/instant_health.png'
import nausea from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/nausea.png'
import slow_falling from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/slow_falling.png'
import weakness from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/weakness.png'
import bad_omen from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/bad_omen.png'
import haste from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/haste.png'
import invisibility from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/invisibility.png'
import night_vision from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/night_vision.png'
import slowness from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/slowness.png'
import wither from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/wither.png'
import blindness from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/blindness.png'
import health_boost from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/health_boost.png'
import jump_boost from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/jump_boost.png'
import poison from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/poison.png'
import speed from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/speed.png'
import conduit_power from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/conduit_power.png'
import hero_of_the_village from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/hero_of_the_village.png'
import levitation from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/levitation.png'
import regeneration from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/regeneration.png'
import strength from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/strength.png'
import dolphins_grace from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/dolphins_grace.png'
import hunger from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/hunger.png'
import luck from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/luck.png'
import resistance from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/resistance.png'
import unluck from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/unluck.png'
import fire_resistance from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/fire_resistance.png'
import instant_damage from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/instant_damage.png'
import mining_fatigue from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/mining_fatigue.png'
import saturation from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/saturation.png'
import water_breathing from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/water_breathing.png'
import darkness from 'minecraft-assets/minecraft-assets/data/1.20.2/mob_effect/darkness.png'

interface Images {
  [key: string]: string;
}

// Export an object containing image URLs
export const images: Images = {
  absorption,
  glowing,
  instant_health,
  nausea,
  slow_falling,
  weakness,
  bad_omen,
  haste,
  invisibility,
  night_vision,
  slowness,
  wither,
  blindness,
  health_boost,
  jump_boost,
  poison,
  speed,
  conduit_power,
  hero_of_the_village,
  levitation,
  regeneration,
  strength,
  dolphins_grace,
  hunger,
  luck,
  resistance,
  unluck,
  bad_luck: unluck,
  good_luck: luck,
  fire_resistance,
  instant_damage,
  mining_fatigue,
  saturation,
  water_breathing,
  darkness
}
