import Button from './Button'
import PixelartIcon from './PixelartIcon'
import styles from './KeybindingsScreen.module.css'


export default () => {
  return <>
    <div className={styles.group}>
      <div className={styles['group-category']}>Chat commands</div>
      <ChatCommandBind />
      <Button
        icon={'pixelarticons:add-box'}
        style={{
          alignSelf: 'center'
        }}
      />
    </div>
    <div className={styles.group}>
      <div className={styles['group-category']}>Custom scripts</div>

    </div>
    <div className={styles.group}>
      <div className={styles['group-category']}>Toggle settings</div>

    </div>
  </>
}

const ChatCommandBind = () => {
  return <div className={styles.actionBinds}>
    <div className={styles['warning-container']}>
      <Button className={styles.button}></Button>
      <div className={styles['matched-bind-warning']}>
        <PixelartIcon
          iconName={'alert'}
          width={5}
          styles={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: '2px'
          }} />
        <div>
          This bind is already in use: <a href="">Rebind</a>

        </div>
      </div>
    </div>
    <input
      type="text"
      className={`${styles['chat-command']}`}
      placeholder='Chat command' />
    <Button
      icon={'pixelarticons:delete'}
      style={{
        color: 'red',
      }} />
  </div>
}


