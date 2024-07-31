struct Cube {
  position: vec3f,
  textureIndex: f32,
  colorBlend: vec3f,
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
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<Cube>; // Changed to @binding(4)
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  let cube = cubes[index];

  // Transform cube position to clip space
  let clipPos =  vec4<f32>(cube.position, 1.0) * uniforms.ViewProjectionMatrix ;

  // Perform sphere-based occlusion test
  //let screen_position = clipPos;
  //let sphereRadius = 1.0 / clipPos.w; //Radius of fixed size for cubes
  let screen_position = clipPos.xyz;
  	// 	screen_position.x = screen_position.x / screen_position.w;
		// screen_position.y = screen_position.y / screen_position.w;
		// // screen_position.z = screen_position.z / screen_position.w;
		// screen_position.x = clipPos.x / clipPos.w;
		// screen_position.y = clipPos.y / clipPos.w;
		// screen_position.z = clipPos.z / clipPos.w;

// 		if (screen_position.x < -1 || 1 < screen_position.x) {
// return;
//     }
// 	//		continue;
// 		if (screen_position.y < -1 || 1 < screen_position.y) {
// return;
//     }
			//continue;
// 		if (screen_position.z < -1 || 1 < screen_position.z) {
// return;
//     }
			//continue;
		// if (screen_position.z < -1 || 1 < screen_position.z) {
		// 	return;

    // }

  //Check if sphere is within view frustum and not completely behind near plane
  //if (clipPos.x < 1.0 &&clipPos.x > 0.0 && clipPos.y < 1.0  && clipPos.y > 0.0) {
    let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
    visibleCubes[visibleIndex] = cube;
  //}
}
