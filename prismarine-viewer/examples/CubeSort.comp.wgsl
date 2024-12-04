struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

struct CubePointer {
  ptr: u32,
}

struct Cube {
  cube: array<u32, 3>,
}

struct Chunk {
  x: i32,
  z: i32,
}

struct Depth {
  locks: array<array<u32, 4096>, 4096>,
}

struct Uniforms {
  textureSize: vec2<u32>,
}

struct CameraPosition {
  position: vec3<f32>,
}

@group(1) @binding(1) var<storage, read_write> occlusion: Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic: Depth;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<CubePointer>;
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(4) var<uniform> cameraPosition: CameraPosition;

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
    var cube = cubes[occlusionData - 1];
    var visibleSides = (cube.cube[1] >> 24) & 63;

    let chunk = chunks[cube.cube[2]];
    var positionX: f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16); //4 bytes
    let positionY: f32 = f32((cube.cube[0] >> 4) & 1023); //10 bytes
    var positionZ: f32 = f32(i32((cube.cube[0] >> 14) & 15) + chunk.z * 16);
    let isUpper : bool = positionY > cameraPosition.position.y;
    let isLeftier : bool = positionX > cameraPosition.position.x;
    let isDeeper : bool = positionZ > cameraPosition.position.z;
    occlusionData = (occlusionData - 1) << 3;

    if ((visibleSides & 1) != 0 && !isUpper) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData;
    }

    if (((visibleSides >> 1) & 1) != 0 && isUpper) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData | 1;
    }

    if (((visibleSides >> 2) & 1) != 0 && !isDeeper) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData | 2;
    }

    if (((visibleSides >> 3) & 1) != 0&& isDeeper) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData | 3;
    }

    if (((visibleSides >> 4) & 1) != 0 && !isLeftier) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData | 4;
    }

    if (((visibleSides >> 5) & 1) != 0 && isLeftier) {
      let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
      visibleCubes[visibleIndex].ptr = occlusionData | 5;
    }
  }
}
