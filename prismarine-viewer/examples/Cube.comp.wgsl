struct Cube {
  cube: array<u32, 3>
}

struct Chunk {
  x: i32,
  z: i32,
  cubesCount: u32
}


struct Depth {
  locks: array<array<atomic<u32>, 4096>, 4096>
}

@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(1) var<storage, read_write> occlusion : Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic : Depth;
@group(0) @binding(4) var<storage, read_write> debug : array<u32>;
             
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  let cube = cubes[index];

  let i = cube.cube[2];
  let chunk = chunks[i];

  var positionX: f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16);
  let positionY: f32 = f32((cube.cube[0] >> 4) & 511);
  var positionZ: f32 = f32(i32((cube.cube[0] >> 13) & 15) + chunk.z * 16);
  let position = vec4f(positionX, positionY, positionZ, 1.0);
  positionX += 0.5;
  positionZ += 0.5;
  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * position;
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  let clipX = clipPos.x / clipPos.w;
  let clipY = clipPos.y / clipPos.w;
  let textureSize: vec2<u32> = vec2<u32>(3840, 2160);
  // Check if cube is within the view frustum z-range (depth within near and far planes)
  let Oversize = 1.0;
  if (
      clipDepth > 0 && clipDepth <=  1 &&
      clipX >= -Oversize && clipX <= Oversize &&
      clipY >= - Oversize && clipY <= Oversize) 
  { //Small Oversize because binding size
    
    let pos : vec2u = vec2u(u32((clipX + 1) / 2 * f32(textureSize.x)),u32((clipY + 1) / 2 * f32(textureSize.y)));

    //atomicCompareExchangeWeak(&depthAtomic.locks[pos.x][pos.y], 1 ,u32(clipDepth * 2147483646));
    let depth = u32(log(clipDepth + 1) * 214748364);
    var depthPrev = atomicMin(&depthAtomic.locks[pos.x][pos.y], depth);

    if (depth < depthPrev) {
      atomicStore(&occlusion.locks[pos.x][pos.y], index);
    }


  }
}
