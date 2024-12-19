@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) ColorBlend: vec4f,
) -> @location(0) vec4f {
  let pixelColor = textureSample(myTexture, mySampler, fragUV);
  // return vec4f(pixelColor.rgb * ColorBlend / 255, pixelColor.a); // Set alpha to 1.0 for full opacity
  return vec4f(pixelColor.rgb, 1.0) * ColorBlend; // Set alpha to 1.0 for full opacity
}
