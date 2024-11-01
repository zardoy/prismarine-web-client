struct Cube {
  cube: array<u32, 2>
}

struct Chunk {
  x: i32,
  z: i32,
  cubesCount: u32
}

struct CubePointer {
  ptr: array<u32, 2>
}

struct Depth {
  locks: array<array<atomic<u32>, 4096>, 4096>
}

@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(1) var occlusion : texture_storage_2d<r32uint, read_write>;
@group(1) @binding(2) var occlusionIndex : texture_storage_2d<r32uint, read_write>;
@group(1) @binding(3) var<storage, read_write> depthAtomic : Depth;
@group(0) @binding(4) var<storage, read_write> debug : array<u32>;
             
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  let cube = cubes[index];

  var counter: u32 = 0;
  var i: u32 = 0;
  while (counter < index) {
      counter += chunks[i].cubesCount;
      if (index < counter) {
        break;
      }
      i++;
  }

  let chunk = chunks[i];

  var positionX: f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16);
  let positionY: f32 = f32((cube.cube[0] >> 4) & 511);
  var positionZ: f32 = f32(i32((cube.cube[0] >> 13) & 15) + chunk.z * 16);
  let position = vec4f(positionX, positionY, positionZ, 1.0);

  //last 8 bits reserved for animations
  positionX += 0.5;
  positionZ += 0.5;
  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * position;
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  let clipX = clipPos.x / clipPos.w;
  let clipY = clipPos.y / clipPos.w;
  let textureSize: vec2<u32> = textureDimensions(occlusion);
  // Check if cube is within the view frustum z-range (depth within near and far planes)
  let Oversize = 1.0;
  if (
      clipDepth > 0 && clipDepth <=  1 &&
      clipX >= -Oversize && clipX <= Oversize &&
      clipY >= - Oversize && clipY <= Oversize) 
  { //Small Oversize because binding size
    
    let pos : vec2u = vec2u(u32((clipX + 1) / 2 * f32(textureSize.x)),u32((clipY + 1) / 2 * f32(textureSize.y)));


    var depthPrev = atomicMin(&depthAtomic.locks[pos.x][pos.y], u32(clipDepth * 2147483646));

    if (depthPrev == 0u) {
      atomicMax(&depthAtomic.locks[pos.x][pos.y], u32(clipDepth * 2147483646));
    }
    if (depthPrev > u32(clipDepth * 2147483646) || depthPrev == 0u) {
    textureStore(occlusion, pos, vec4<u32>(index,0u,0u,1u));
    textureStore(occlusionIndex, pos, vec4<u32>(i,0u,0u,1u));
    }
  }
}
