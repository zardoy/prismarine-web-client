struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

struct CubePointer {
  ptr: u32
}

struct Depth {
  locks: array<array<u32, 4096>, 4096>
}

struct Uniforms {
  textureSize: vec2<u32>
}

@group(1) @binding(1) var <storage, read_write>occlusion : Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic : Depth;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<CubePointer>;
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let position = global_id.xy;
  storageBarrier();
  depthAtomic.locks[position.x][position.y] = 4294967295;
  let textureSize = uniforms.textureSize;
  if (position.x >= textureSize.x || position.y >= textureSize.y) {
    return;
  }

  var occlusionData: u32 = occlusion.locks[position.x][position.y];



if (occlusionData != 0) {
    let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
    visibleCubes[visibleIndex].ptr = occlusionData - 1;
  }
}
