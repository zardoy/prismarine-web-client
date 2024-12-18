// Fragment shader
@group(0) @binding(0) var tex: texture_depth_2d;
 @group(0) @binding(1) var mySampler: sampler;
 @group(0) @binding(2) var texColor: texture_2d<f32>;
 @group(0) @binding(3) var<uniform> clearColor: vec4<f32>;
const sampleDist : f32 = 1.0;
const sampleStrength : f32 = 2.2;

const SAMPLES: f32 = 24.;
fn hash( p: vec2<f32> ) -> f32 { return fract(sin(dot(p, vec2(41, 289)))*45758.5453); }

fn lOff() -> vec3<f32>{

    var u = sin(vec2(1.57, 0));
    var a = mat2x2<f32>(u.x,u.y, -u.y, u.x);

    var l : vec3<f32> = normalize(vec3<f32>(1.5, 1., -0.5));
    var temp = a * l.xz;
    l.x = temp.x;
    l.z = temp.y;
    temp = a * l.xy;
    l.x = temp.x;
    l.y = temp.y;

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

    var l = lOff();
    
    var tuv =  uvs-l.xy*.45;

    var dTuv = tuv*density/SAMPLES;

    var temp = textureSample(tex,mySampler, uvs);
    var col : f32;
    var outTex = textureSample(texColor, mySampler, uvs);
    if (temp == 1.0) {
        col = temp * 0.25;
    }

    uvs += dTuv*(hash(uvs.xy - 1.0) * 2. - 1.);

    for(var i=0.0; i < SAMPLES; i += 1){

        uvs -= dTuv;
        var temp = textureSample(tex, mySampler, uvs);
        if (temp == 1.0) {
            col +=temp * weight;
        }
        weight *= decay;

    }


    //col *= (1. - dot(tuv, tuv)*.75);
    let t = clearColor.xyz * sqrt(smoothstep(0.0, 1.0, col));
    if (temp == 1.0) {
        return vec4(t, 1.0);
    }


    return outTex + vec4(t, 1.0);
}
