
struct Cube {
  cube : array<u32, 3>
}

struct Chunk{
  x : i32,
  z : i32,
  opacity: i32,
  offset: i32,
  length: i32
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
  @location(1) @interpolate(flat) ColorBlend: vec4f,
}
@group(1) @binding(0) var<storage, read> cubes: array<Cube>;
@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(0) @binding(3) var<storage, read> models: array<CubeModel>;
@group(1) @binding(1) var<storage, read> visibleCubes: array<CubePointer>;
@group(1) @binding(2) var<storage, read> chunks : array<Chunk>;
@group(0) @binding(4) var<uniform> rotatations: array<mat4x4<f32>, 6>;
@group(0) @binding(2) var myTexture: texture_2d<f32>;
@group(0) @binding(5) var<uniform> tileSize: vec2<f32>;

@vertex
fn main(
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  let normalIndex = visibleCubes[instanceIndex].ptr & 7;
  let cube = cubes[visibleCubes[instanceIndex].ptr >> 3];

  let chunk = chunks[cube.cube[2]];

  let modelIndex : u32 = extractBits(cube.cube[0], 18, 14); ///14 bits

  var cube_position = vec3f(f32(i32(extractBits(cube.cube[0], 0, 4)) + chunk.x * 16), 
                            f32(extractBits(cube.cube[0], 4, 10)), 
                            f32(i32(extractBits(cube.cube[0], 14, 4)) + chunk.z * 16));

  cube_position += 0.5;

  var colorBlend = vec4f(unpack4xU8(cube.cube[1]));
  colorBlend.a = f32(chunk.opacity);
  colorBlend /= 255;

  var textureIndex : u32;
  var Uv = vec2(uv.x, (1.0 - uv.y));
  let normal = rotatations[normalIndex];

  switch (normalIndex) {
    case 0:
    {
       Uv = vec2((1.0f-uv.x), (1.0 - uv.y));
       textureIndex = models[modelIndex].textureIndex123 & 1023;
    }
    case 1:
    {
      textureIndex = (models[modelIndex].textureIndex123 >> 10) & 1023;
    }
    case 2:
    {
      textureIndex = (models[modelIndex].textureIndex123 >> 20) & 1023;
    }
    case 3:
    {
      textureIndex = models[modelIndex].textureIndex456 & 1023;
    }
    case 4:
    {
      textureIndex = (models[modelIndex].textureIndex456 >> 10) & 1023;
    }
    case 5, default:
    {
     textureIndex = (models[modelIndex].textureIndex456 >> 20) & 1023;
    }
  }

  let textureSize = vec2f(textureDimensions(myTexture));
  let tilesPerTexture= textureSize / tileSize;
  Uv = vec2(Uv / tilesPerTexture + vec2f(trunc(f32(textureIndex) % tilesPerTexture.y), trunc(f32(textureIndex) / tilesPerTexture.x)) / tilesPerTexture);

  var output: VertexOutput;
  output.Position = ViewProjectionMatrix * (position * normal + vec4(cube_position, 0.0));
  output.fragUV = Uv;
  output.ColorBlend = colorBlend;
  return output;
}
