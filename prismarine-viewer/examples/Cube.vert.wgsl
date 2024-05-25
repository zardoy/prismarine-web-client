struct Uniforms {
  ViewProjectionMatrix : mat4x4f,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
}

@vertex
fn main(
  @location(0) position : vec4f,
  @location(1) uv : vec2f,
  @location(2) ModelMatrix : vec3f,
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.ViewProjectionMatrix * (position +vec4f(ModelMatrix, 0.0));
  output.fragUV = uv;
  return output;
}
