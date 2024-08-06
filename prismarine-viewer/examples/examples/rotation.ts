import { Vec3 } from 'vec3'
import { ExampleSetupFunction } from './type'

const setup: ExampleSetupFunction = (world, mcData, mesherConfig, setupParam) => {
  mesherConfig.debugModelVariant = [3]
  void world.setBlockStateId(new Vec3(0, 0, 0), mcData.blocksByName.sand.defaultState!)
}

export default setup
