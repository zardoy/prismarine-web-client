// Slider.tsx
import React, { useState, useEffect } from 'react'
import styles from './slider.module.css'
import SharedHudVars from './SharedHudVars'

interface Props extends React.ComponentProps<'div'> {
  label: string;
  value: number;
  unit?: string;
  width?: number;
  valueDisplay?: string | number;
  min?: number;
  max?: number;
  disabledReason?: string;

  updateValue?: (value: number) => void;
  updateOnDragEnd?: boolean;
}

const Slider: React.FC<Props> = ({
  label,
  unit = '%',
  width,
  value: valueProp,
  valueDisplay,
  min = 0,
  max = 100,
  disabledReason,

  updateOnDragEnd = false,
  updateValue,
  ...divProps
}) => {
  const [value, setValue] = useState(valueProp)
  const getRatio = (v = value) => Math.max(Math.min((v - min) / (max - min), 1), 0)
  const [ratio, setRatio] = useState(getRatio())

  useEffect(() => {
    setValue(valueProp)
  }, [valueProp])
  useEffect(() => {
    setRatio(getRatio())
  }, [value, min, max])

  const fireValueUpdate = (dragEnd: boolean, v = value) => {
    if (updateOnDragEnd !== dragEnd) return
    updateValue?.(v)
  }

  return (
    <SharedHudVars>
      <div className={styles['slider-container']} style={{ width }} {...divProps}>
        <input
          type="range"
          className={styles.slider}
          min={min}
          max={max}
          value={value}
          disabled={!!disabledReason}
          onChange={(e) => {
            const newValue = Number(e.target.value)
            setValue(newValue)
            fireValueUpdate(false, newValue)
          }}
          // todo improve correct handling of drag end
          onLostPointerCapture={() => {
            fireValueUpdate(true)
          }}
          onPointerUp={() => {
            fireValueUpdate(true)
          }}
          onKeyUp={() => {
            fireValueUpdate(true)
          }}
        />
        <div className={styles.disabled} title={disabledReason} />
        <div className={styles['slider-thumb']} style={{ left: `calc((100% * ${ratio}) - (8px * ${ratio}))` }} />
        <label className={styles.label}>
          {label}: {valueDisplay ?? value} {unit}
        </label>
      </div>
    </SharedHudVars>
  )
}

export default Slider
