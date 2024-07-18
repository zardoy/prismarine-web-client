struct Cube {
  position: vec3<f32>,
  textureIndex: f32,
  colorBlend: vec3<f32>,
}

struct Uniforms {
  ViewProjectionMatrix: mat4x4<f32>,
}

struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

@group(1) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(1) var<storage, read> cubes: array<Cube>;
@group(1) @binding(2) var<storage, read_write> visibleCubes: array<Cube>; // Changed to @binding(4)
@group(1) @binding(3) var<storage, read_write> drawParams: array<IndirectDrawParams>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  let cube = cubes[index];

  // Transform cube position to clip space
  let clipPos = uniforms.ViewProjectionMatrix * vec4<f32>(cube.position, 1.0);

  // Perform sphere-based occlusion test
  let ndcPos = clipPos.xyz / clipPos.w;
  let sphereRadius = 1.0 / clipPos.w; //Radius of fixed size for cubes

  // Check if sphere is within view frustum and not completely behind near plane
  if (abs(ndcPos.x) - sphereRadius <= 1.0 &&
      abs(ndcPos.y) - sphereRadius <= 1.0 &&
      ndcPos.z - sphereRadius <= 1.0 &&
      ndcPos.z + sphereRadius >= -1.0) {
    let visibleIndex = atomicAdd(&drawParams[index].instanceCount, 1u);
    visibleCubes[visibleIndex] = cube;
  }
}
