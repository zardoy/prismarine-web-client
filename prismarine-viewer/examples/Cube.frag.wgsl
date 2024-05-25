@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1)  TextueIndex: f32
) -> @location(0) vec4f {
  return textureSample(myTexture, mySampler, fragUV/64.0 + vec2f(TextueIndex%32,TextueIndex/32.0 )/32.0);
}
