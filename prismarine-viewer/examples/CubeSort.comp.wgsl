struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

struct CubePointer {
  ptr: array<u32, 2>
}

@group(1) @binding(1) var occlusion: texture_storage_2d<r32uint, read_write>;
@group(1) @binding(2) var occlusionIndex: texture_storage_2d<r32uint, read_write>;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<CubePointer>;
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  textureBarrier();
  let position = global_id.xy;
  if (position.x >= textureDimensions(occlusion).x || position.y >= textureDimensions(occlusion).y) {
    return;
  }

  var occlusionData: vec4<u32> = textureLoad(occlusion, position);
  //textureBarrier();
  textureStore(occlusion, position, vec4<u32>(0, 0, 0, 1));

  var occlusionDataIndex: vec4<u32> = textureLoad(occlusionIndex, position);
  //textureBarrier();
  textureStore(occlusionIndex, position, vec4<u32>(0, 0, 0, 1));

  //textureBarrier();
  if (occlusionData.x != 0) {
    let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
    visibleCubes[visibleIndex].ptr[0] = occlusionData.x;
    visibleCubes[visibleIndex].ptr[1] = occlusionDataIndex.x;
  }
}
