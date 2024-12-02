struct Cube {
  cube: array<u32, 3>
}

struct Chunk {
  x: i32,
  z: i32,
}


struct Depth {
  locks: array<array<atomic<u32>, 4096>, 4096>
}

struct Uniforms {
  textureSize: vec2<u32>
}

@group(1) @binding(3) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(1) var<storage, read_write> occlusion : Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic : Depth;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  let cube = cubes[index];

  let i = cube.cube[2];
  let chunk = chunks[i];

  var positionX: f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16); //4 bytes
  let positionY: f32 = f32((cube.cube[0] >> 4) & 511); //4 bytes
  var positionZ: f32 = f32(i32((cube.cube[0] >> 13) & 15) + chunk.z * 16);
  positionX += 0.5;
  positionZ += 0.5;
  let position = vec4f(positionX, positionY, positionZ, 1.0);
  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * position;
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  let clipX = clipPos.x / clipPos.w;
  let clipY = clipPos.y / clipPos.w;
  let textureSize = uniforms.textureSize;
  // Check if cube is within the view frustum z-range (depth within near and far planes)
  if (
      clipDepth > 0 && clipDepth <=  1 &&
      clipX >= -1 && clipX <= 1 &&
      clipY >= - 1 && clipY <= 1)
  { 

    let pos : vec2u = vec2u(u32((clipX + 1) / 2 * f32(textureSize.x)),u32((clipY + 1) / 2 * f32(textureSize.y)));

    //atomicCompareExchangeWeak(&depthAtomic.locks[pos.x][pos.y], 1 ,u32(clipDepth * 2147483646));
    let depth = u32(clipDepth * 4294967295);
    var depthPrev = atomicMin(&depthAtomic.locks[pos.x][pos.y], depth);
    //depthPrev = atomicLoad(&depthAtomic.locks[pos.x][pos.y]);
    if (depth < depthPrev) {
      atomicStore(&occlusion.locks[pos.x][pos.y], index + 1);
    }


  }
}
