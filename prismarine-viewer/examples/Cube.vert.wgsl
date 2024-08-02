struct Uniforms {
  ViewProjectionMatrix: mat4x4<f32>,
}

struct Cube {
  position: vec3f,
  textureIndex: f32,
  colorBlend: vec3f,
  //tt: f32
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) TextureIndex: f32,
  @location(2) @interpolate(flat) ColorBlend: vec3f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<storage, read> visibleCubes: array<Cube>;

@vertex
fn main(
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  let cube = visibleCubes[instanceIndex];
  //cube.position.x = instance_index * 2;
  var output: VertexOutput;
  output.Position = uniforms.ViewProjectionMatrix * (position + vec4<f32>(cube.position, 0.0) + vec4<f32>(0.5, 0.0, 0.5, 0.0));
  output.fragUV = uv;
  output.TextureIndex = cube.textureIndex;
  output.ColorBlend = cube.colorBlend;
  return output;
}
