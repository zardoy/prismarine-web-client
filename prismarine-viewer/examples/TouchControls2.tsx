import React, { useEffect } from 'react'
import { LeftTouchArea, RightTouchArea, useInterfaceState } from '@dimaka/interface'
import { css } from '@emotion/css'
import { Viewer } from '../viewer/lib/viewer'
import { renderToDom } from '@zardoy/react-util'
import { Vec3 } from 'vec3'
import * as THREE from 'three'

declare const viewer: Viewer
const Controls = () => {
  // todo setting
  const usingTouch = navigator.maxTouchPoints > 0

  useEffect(() => {
    let vec3 = new Vec3(0, 0, 0)

    setInterval(() => {
      viewer.camera.position.add(new THREE.Vector3(vec3.x, vec3.y, vec3.z))
    }, 1000 / 30)

    useInterfaceState.setState({
      isFlying: false,
      uiCustomization: {
        touchButtonSize: 40,
      },
      updateCoord ([coord, state]) {
        vec3 = new Vec3(0, 0, 0)
        vec3[coord] = state
      }
    })
  }, [])

  if (!usingTouch) return null
  return (
    <div
      style={{ zIndex: 8 }}
      className={css`
        position: fixed;
        inset: 0;
        height: 100%;
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: flex-end;
        pointer-events: none;
        touch-action: none;
        & > div {
            pointer-events: auto;
        }
    `}
    >
      <LeftTouchArea />
      <div />
      <RightTouchArea />
    </div>
  )
}

export const renderPlayground = () => {
  renderToDom(<Controls />, {
    // selector: 'body',
  })
}
