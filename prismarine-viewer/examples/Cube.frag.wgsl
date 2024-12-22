@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

 struct FragmentOutput {
   @builtin(frag_depth) depth: f32,
  @location(0) color: vec4f 
 }

 fn linearize_depth_ndc(ndc_z: f32, z_near: f32, z_far: f32) -> f32 {
    return z_near * z_far / (z_far - ndc_z * (z_far - z_near));
}

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) ColorBlend: vec4f,
  @builtin(position) Position: vec4f
) -> FragmentOutput {
  let pixelColor = textureSample(myTexture, mySampler, fragUV);

  var output: FragmentOutput;
  output.depth = linearize_depth_ndc(Position.z, 0.05, 10000) / 10000;
  output.color = vec4f(pixelColor.rgb, 1.0) * ColorBlend;;
  return output; 
}
