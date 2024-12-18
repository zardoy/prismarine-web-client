
struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) fragUV: vec2f,
}


@vertex
fn main(
  @location(0) position: vec4<f32>,
  @location(1) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.Position = vec4f(position.xy, 0.0 , 1.0);
    output.Position = sign(output.Position);
    output.fragUV = uv;
    return output;
}