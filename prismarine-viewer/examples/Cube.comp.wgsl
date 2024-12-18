struct Cube {
  cube: array<u32, 3>
}

struct Chunk {
  x: i32,
  z: i32,
  opacity: i32,
  offset: i32,
  length: i32
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

@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks: array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(1) @binding(1) var<storage, read_write> occlusion : Depth;
@group(1) @binding(2) var<storage, read_write> depthAtomic : Depth;
@group(2) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(3) var<uniform> cameraPosition: CameraPosition;
@group(0) @binding(5) var depthTexture: texture_depth_2d;
@group(0) @binding(6) var<uniform> rejectZ: u32;

fn linearize_depth_ndc(ndc_z: f32, z_near: f32, z_far: f32) -> f32 {
    return z_near * z_far / (z_far - ndc_z * (z_far - z_near));
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&chunks)) {
    return;
  }

  let chunk = chunks[index];
  let chunkPosition = vec4(f32(chunk.x * 16), 0.0, f32(chunk.z * 16), 0.0);
  for (var i = chunk.offset; i < chunk.offset + chunk.length; i++) {
    let cube = cubes[i];
    let positionX: f32 = f32(cube.cube[0] & 15) + 0.5; //4 bytes
    let positionY: f32 = f32((cube.cube[0] >> 4) & 1023); //10 bytes
    let positionZ: f32 = f32((cube.cube[0] >> 14) & 15) + 0.5;
    let position = vec4f(positionX, positionY, positionZ, 1.0) + chunkPosition;
    // Transform cube position to clip space
    let clipPos = ViewProjectionMatrix * position;
    let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
    var clipX = clipPos.x / clipPos.w;
    var clipY = clipPos.y / clipPos.w;
    let textureSize = uniforms.textureSize;

    let clipped = 1 / clipPos.z * 2;
    // Check if cube is within the view frustum z-range (depth within near and far planes)
    if (
        clipDepth <= -clipped || clipDepth > 1 ||
        clipX < - 1 - clipped || clipX > 1 + clipped  ||
        clipY < - 1 - clipped || clipY > 1 + clipped)
    {
      continue;
    }

      clipY = clamp(clipY, -1, 1);
      clipX = clamp(clipX, -1, 1);

    var pos : vec2u = vec2u(u32((clipX * 0.5 + 0.5) * f32(textureSize.x)),u32((clipY * 0.5 + 0.5) * f32(textureSize.y)));
    let k = linearize_depth_ndc(clipDepth, 0.05, 10000);
    if (rejectZ == 1 && k - 20 > linearize_depth_ndc(textureLoad(depthTexture, vec2u(pos.x, textureSize.y - pos.y), 0), 0.05, 10000)) {
      continue;
    }

    let depth = u32((10000 - k) * 1000);
    if (depth > atomicMax(&depthAtomic.locks[pos.x][pos.y], depth)) {

      atomicStore(&occlusion.locks[pos.x][pos.y], u32(i) + 1);
    }
  }
}
