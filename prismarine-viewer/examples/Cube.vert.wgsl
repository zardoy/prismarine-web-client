struct Uniforms {
  ViewProjectionMatrix: mat4x4<f32>,
}

struct Cube {
  position: vec3<f32>,
  textureIndex: f32,
  colorBlend: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) @interpolate(flat) TextureIndex: f32,
  @location(2) @interpolate(flat) ColorBlend: vec3<f32>
}

@group(1) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(2) var<storage, read> visibleCubes: array<Cube>;

@vertex
fn main(
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
  let cube = visibleCubes[instanceIndex];

  var output: VertexOutput;
  output.Position = uniforms.ViewProjectionMatrix * (position + vec4<f32>(cube.position, 0.0) + vec4<f32>(0.5, 0.0, 0.5, 0.0));
  output.fragUV = uv;
  output.TextureIndex = cube.textureIndex;
  output.ColorBlend = cube.colorBlend;
  return output;
}
