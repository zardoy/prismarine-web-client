import { useIsModalActive } from './utilsApp'

export default () => {
  const isModalActive = useIsModalActive('mods')

  if (!isModalActive) return null
  return <div>
    <div className="dirt-bg" />
    <div className="fullscreen">
      <div className="screen-title">Client Mods</div>
    </div>
  </div>
}
