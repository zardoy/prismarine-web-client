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

struct CameraPosition {
  position: vec3<f32>,
}

@group(1) @binding(3) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(1) var<storage, read_write> occlusion : Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic : Depth;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(4) var<uniform> cameraPosition: CameraPosition;
@group(0) @binding(5) var depthTexture: texture_depth_2d;

fn linearize_depth_ndc(ndc_z: f32, z_near: f32, z_far: f32) -> f32 {
    return z_near * z_far / (z_far - ndc_z * (z_far - z_near));
}

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
  let positionY: f32 = f32((cube.cube[0] >> 4) & 1023); //10 bytes
  var positionZ: f32 = f32(i32((cube.cube[0] >> 14) & 15) + chunk.z * 16);
  positionX += 0.5;
  positionZ += 0.5;
  let position = vec4f(positionX, positionY, positionZ, 1.0);
  let transopesPos = position.xyz - cameraPosition.position;
  let nearby : bool = abs(transopesPos.x) <= 8 && abs(transopesPos.y) <= 8 && abs(transopesPos.z) <= 8;
  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * position;
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  var clipX = clipPos.x / clipPos.w;
  var clipY = clipPos.y / clipPos.w;
  let textureSize = uniforms.textureSize;
  // Check if cube is within the view frustum z-range (depth within near and far planes)
  if (
    ((clipDepth > 0 && clipDepth <= 1) &&
      (clipX >= -1 && clipX <= 1)  &&
      (clipY >= - 1 && clipY <= 1)) || nearby)
  {
    if (nearby) {
      clipY = clamp(clipY, -1, 1);
      clipX = clamp(clipX, -1, 1);
    }
    var pos : vec2u = vec2u(u32((clipX + 1) / 2 * f32(textureSize.x)),u32((clipY + 1) / 2 * f32(textureSize.y)));

    // if (linearize_depth_ndc(clipDepth, 0.05, 10000) - 2 > linearize_depth_ndc(textureLoad(depthTexture, vec2u(pos.x, textureSize.y - pos.y), 0), 0.05, 10000)  && !nearby) { 
    //   return;
    // }
    if (nearby) {
      if (clipX == 1|| clipX == -1) {

      pos.x = textureSize.x + 1;
      }
      if (clipY == 1|| clipY == -1) {

      pos.y = index % textureSize.y;
      }
    }
    let depth = u32(clipDepth * 10000);
    var depthPrev = atomicMin(&depthAtomic.locks[pos.x][pos.y], depth);
    //depthPrev = atomicLoad(&depthAtomic.locks[pos.x][pos.y]);
    if (depth < depthPrev) {
      // let k = atomicCompareExchangeWeak(&depthAtomic.locks[pos.x][pos.y], depth, depth);
      // if (k.exchanged == true) {

        atomicStore(&occlusion.locks[pos.x][pos.y], index + 1);
      // }
    }

  }
}
