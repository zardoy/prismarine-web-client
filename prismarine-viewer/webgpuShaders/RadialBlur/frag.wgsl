// Fragment shader
@group(0) @binding(0) var tex: texture_depth_2d;
 @group(0) @binding(1) var mySampler: sampler;
 @group(0) @binding(2) var texColor: texture_2d<f32>;
const sampleDist : f32 = 1.0;
const sampleStrength : f32 = 2.2; 

const SAMPLES: f32 = 24.; 
fn hash( p: vec2<f32> ) -> f32 { return fract(sin(dot(p, vec2(41, 289)))*45758.5453); }


fn lOff() -> vec3<f32>{    
    
    var u = sin(vec2(1.57, 0));
    var a = mat2x2<f32>(u.x,u.y, -u.y, u.x);
    
    var l : vec3<f32> = normalize(vec3<f32>(1.5, 1., -0.5));
    l.x = vec2(a * l.xz).x;
    var temp = a * l.xy;
    l.x = temp.x;
    l.z = temp.y;
    
    return l;
    
}

@fragment
fn main(
      @location(0) uv: vec2f,
) -> @location(0) vec4f 
{
    var uvs = uv;
    uvs.y = 1.0 - uvs.y;
    var decay : f32 = 0.93; 
    // Controls the sample density, which in turn, controls the sample spread.
    var density = 0.5; 
    // Sample weight. Decays as we radiate outwards.
    var weight = 0.04; 
    
    // Light offset. Kind of fake. See above.
    var l = lOff();
    
    // Offset texture position (uvs - .5), offset again by the fake light movement.
    // It's used to set the blur direction (a direction vector of sorts), and is used 
    // later to center the spotlight.
    //
    // The range is centered on zero, which allows the accumulation to spread out in
    // all directions. Ie; It's radial.
    var tuv =  uvs-l.xy*.45;
    
    // Dividing the direction vector above by the sample number and a density factor
    // which controls how far the blur spreads out. Higher density means a greater 
    // blur radius.
    var dTuv = tuv*density/SAMPLES;
    
    // Grabbing a portion of the initial texture sample. Higher numbers will make the
    // scene a little clearer, but I'm going for a bit of abstraction.
    var temp = textureSample(tex,mySampler, uvs.xy);
    var col : f32;
    if (temp == 1.0) {
        col = temp * 0.25;
    }
    // Jittering, to get rid of banding. Vitally important when accumulating discontinuous 
    // samples, especially when only a few layers are being used.
    uvs += dTuv*(hash(uvs.xy - 1.0));
    
    // The radial blur loop. Take a texture sample, move a little in the direction of
    // the radial direction vector (dTuv) then take another, slightly less weighted,
    // sample, add it to the total, then repeat the process until done.
    for(var i=0.0; i < SAMPLES; i += 1){
    
        uvs -= dTuv;
        var temp = textureSample(tex, mySampler, uvs);
        if (temp == 1.0) {
            col +=temp * weight;
        }
        weight *= decay;
        
    }
    
    // Multiplying the final color with a spotlight centered on the focal point of the radial
    // blur. It's a nice finishing touch... that Passion came up with. If it's a good idea,
    // it didn't come from me. :)
    col *= (1. - dot(tuv, tuv)*.75);
    
    // Smoothstepping the final color, just to bring it out a bit, then applying some 
    // loose gamma correction.
    uvs = uv;
    uvs.y = 1.0 - uvs.y;
    return textureSample(texColor, mySampler, uvs) + sqrt(smoothstep(0.0, 1.0, col));
}

// @group(0) @binding(1) var mySampler: sampler;
// @group(0) @binding(2) var myTexture: texture_2d<f32>;

// @fragment
// fn main(
//   @location(0) fragUV: vec2f,
//   @location(1) @interpolate(flat) TextureIndex: f32,
//   @location(2) @interpolate(flat) ColorBlend: vec3f
// ) -> @location(0) vec4f {
//   let textureSize: vec2<f32> = vec2<f32>(textureDimensions(myTexture));
//   let tileSize: vec2<f32> = vec2<f32>(16.0, 16.0);
//   let tilesPerTexture: vec2<f32> = textureSize / tileSize;
//   let pixelColor = textureSample(myTexture, mySampler, fragUV / tilesPerTexture + vec2f(trunc(TextureIndex % tilesPerTexture.y), trunc(TextureIndex / tilesPerTexture.x)) / tilesPerTexture);
//   // return vec4f(pixelColor.rgb * ColorBlend / 255, pixelColor.a); // Set alpha to 1.0 for full opacity
//   return vec4f(pixelColor.rgb * ColorBlend / 255, 1.0); // Set alpha to 1.0 for full opacity
// }
