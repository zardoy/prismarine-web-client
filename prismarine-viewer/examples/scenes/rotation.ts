import { Vec3 } from 'vec3'
import { SceneSetupFunction } from './type'

const setup: SceneSetupFunction = (world, mcData, mesherConfig, setupParam) => {
  mesherConfig.debugModelVariant = [3]
  void world.setBlockStateId(new Vec3(0, 0, 0), mcData.blocksByName.sand.defaultState!)
}

export default setup
