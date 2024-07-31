import { CustomWorld } from 'flying-squid/dist/lib/modules/world'
import { MesherConfig } from '../../viewer/lib/mesher/shared'
import { IndexedData } from 'minecraft-data'

type SetupParams = {}
export type ExampleSetupFunction = (world: CustomWorld, mcData: IndexedData, mesherConfig: MesherConfig, setupParam: SetupParams) => void
