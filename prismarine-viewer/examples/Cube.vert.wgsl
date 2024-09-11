
struct Cube {
  cube : array<u32, 2>
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) TextureIndex: f32,
  @location(2) @interpolate(flat) ColorBlend: vec3f
}
@group(1) @binding(0) var<storage, read> cubes: array<Cube>;
@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(1) var<storage, read> visibleCubes: array<u32>;

@vertex
fn main(
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  let cube = cubes[visibleCubes[instanceIndex]];
  let positionX : f32 = f32(cube.cube[0] & 1023);
  let positionY : f32 = f32((cube.cube[0] >> 10) & 1023);
  let positionZ : f32 = f32((cube.cube[0] >> 20) & 1023);
  let textureIndex : f32 = f32((((cube.cube[1] >> 24) & 255) << 2) | ((cube.cube[0] >> 30) & 3) ); 
  //textureIndex = 1.0;
  let cube_position = vec4f(positionX, positionY, positionZ, 0.0);
  let colorBlendR : f32 = f32(cube.cube[1] & 255);
  let colorBlendG : f32 = f32((cube.cube[1] >> 8) & 255);
  let colorBlendB : f32 = f32((cube.cube[1] >> 16) & 255);
  let colorBlend = vec3f(colorBlendR, colorBlendG, colorBlendB);
  //last 8 bits reserved for animations
  //cube.position.x = instance_index * 2;
  var output: VertexOutput;
  output.Position = ViewProjectionMatrix * (position + cube_position + vec4<f32>(0.5, 0.0, 0.5, 0.0));
  output.fragUV = uv;
  output.TextureIndex = textureIndex;
  output.ColorBlend = colorBlend;
  return output;
}
