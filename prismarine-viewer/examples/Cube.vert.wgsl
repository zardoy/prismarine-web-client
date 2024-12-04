
struct Cube {
  cube : array<u32, 3>
}

struct Chunk{
  x : i32,
  z : i32,
}


struct CubePointer {
  ptr: u32
}

struct CubeModel {
  textureIndex123: u32,
  textureIndex456: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) TextureIndex: f32,
  @location(2) @interpolate(flat) ColorBlend: vec3f
}
@group(1) @binding(0) var<storage, read> cubes: array<Cube>;
@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(0) @binding(3) var<storage, read> models: array<CubeModel>;
@group(1) @binding(1) var<storage, read> visibleCubes: array<CubePointer>;
@group(1) @binding(2) var<storage, read> chunks : array<Chunk>;

fn rotationX(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, c, -s, 0.0),
        vec4<f32>(0.0, s, c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0),
    );
}

fn rotationY(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return mat4x4<f32>(
        vec4<f32>(c, 0.0, s, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(-s, 0.0, c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0),
    );
}

@vertex
fn main(
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  let normalIndex = visibleCubes[instanceIndex].ptr & 7;
  let cube = cubes[visibleCubes[instanceIndex].ptr >> 3];
  //let chunkIndex = (cube.cube[1] >> 24)  + ((cube.cube[0] >> 27) << 8);
  let chunk = chunks[cube.cube[2]];

  var positionX : f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16); //4 bytes
  var positionY : f32 = f32((cube.cube[0] >> 4) & 1023); //10 bytes
  var positionZ : f32 = f32(i32((cube.cube[0] >> 14) & 15) + chunk.z * 16); // 4 bytes
  let modelIndex : u32 = ((cube.cube[0] >> 18) & 16383); ///14 bits
  var textureIndex : u32;

  positionX += 0.5;
  positionZ += 0.5;
  positionY += 0.5;

  let cube_position = vec4f(positionX, positionY, positionZ, 0.0);

  let colorBlendR : f32 = f32(cube.cube[1] & 255);
  let colorBlendG : f32 = f32((cube.cube[1] >> 8) & 255);
  let colorBlendB : f32 = f32((cube.cube[1] >> 16) & 255);
  let colorBlend = vec3f(colorBlendR, colorBlendG, colorBlendB);


  var normal : mat4x4<f32>;

  switch (normalIndex) {
    case 0:
    {
       normal = rotationX(radians(-90f));
       textureIndex = models[modelIndex].textureIndex123 & 1023;
    }
    case 1:
    {
      normal = rotationX(radians(90f));
      textureIndex = (models[modelIndex].textureIndex123 >> 10) & 1023;
    }
    case 2:
    {
      normal = rotationX(radians(0f));
      textureIndex = (models[modelIndex].textureIndex123 >> 20) & 1023;
    }
    case 3:
    {
      normal = rotationX(radians(180f));
      textureIndex = models[modelIndex].textureIndex456 & 1023;
    }
    case 4:
    {
      normal = rotationY(radians(90f));
      textureIndex = (models[modelIndex].textureIndex456 >> 10) & 1023;
    }
    case 5, default:
    {
     normal = rotationY(radians(-90f));
     textureIndex = (models[modelIndex].textureIndex456 >> 20) & 1023;
    }
  }

  var output: VertexOutput;
  output.Position = ViewProjectionMatrix * (position * normal + cube_position);
  output.fragUV = uv;
  output.TextureIndex = f32(textureIndex);
  output.ColorBlend = colorBlend;
  return output;
}
