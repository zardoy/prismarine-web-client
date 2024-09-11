struct Cube {
  cube : array<u32, 2>
}

struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> cubes: array<Cube>;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<u32>; 
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


  let positionX : f32 = f32(cube.cube[0] & 1023);
  let positionY : f32 = f32((cube.cube[0] >> 10) & 1023);
  let positionZ : f32 = f32((cube.cube[0] >> 20) & 1023);
  let position = vec4f(positionX, positionY, positionZ, 1.0);
  // let textureIndex : f32 = f32((cube.cube[0] >> 24) & 8);
  // let colorBlendR : f32 = f32(cube.cube[1] & 8);
  // let colorBlendG : f32 = f32((cube.cube[1] >> 8) & 8);
  // let colorBlendB : f32 = f32((cube.cube[1] >> 16) & 8);
  // let colorBlend = vec3f(colorBlendR, colorBlendG, colorBlendB);
  //last 8 bits reserved for animations

  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * (position+ vec4<f32>(0.5, 0.5, 0.5, 0.0));
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
    visibleCubes[visibleIndex] = index;
  }
}
