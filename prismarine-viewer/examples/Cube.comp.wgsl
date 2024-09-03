struct Cube {
  cube : array<f32, 8>
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

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> cubes: array<Cube>;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<Cube>; 
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;
             
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  //   position: vec3f,
  // textureIndex: f32,
  // colorBlend: vec3f,
  let cube = cubes[index];
  

  let position = vec4<f32>(cube.cube[0], cube.cube[1], cube.cube[2], 1);
  let textureIndex = cube.cube[3];
  let colorBlend = vec4<f32>(cube.cube[4], cube.cube[5], cube.cube[6], 1);

  // Transform cube position to clip space
  let clipPos = uniforms.ViewProjectionMatrix * (position+ vec4<f32>(0.5, 0.5, 0.5, 0.0));
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  let clipX = clipPos.x / clipPos.w;
  let clipY = clipPos.y / clipPos.w;

  // Check if cube is within the view frustum z-range (depth within near and far planes)
  let Oversize = 1.25;
  if (
      clipDepth > 0 && clipDepth <= 1 &&
      clipX >= -1.0 * Oversize && clipX <= 1.0 * Oversize &&
      clipY >= -1.0 * Oversize && clipY <= 1.0 * Oversize) { //Small Oversize because binding size
    let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
    visibleCubes[visibleIndex] = cube;
  }
}
