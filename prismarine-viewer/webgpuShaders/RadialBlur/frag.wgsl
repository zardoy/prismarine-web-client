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
    var temp = a * l.xz;
    l.x = temp.x;
    l.z = temp.y;
    temp = a * l.xy;
    l.x = temp.x;
    l.y = temp.y;

    return l;
}

const SAMPLES1= 16.0;
const INTENSITY  = 1.0;
const SCALE  = 1;
const BIAS  = 0.5;
const SAMPLE_RAD = 0.02;
const MAX_DISTANCE = 0.07;

const MOD3 = vec3(.1031,.11369,.13787);

fn hash12(p : vec2<f32>) -> f32
{
	var p3: vec3<f32>  = fract(vec3(p.xyx) * MOD3);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p : vec2<f32>) -> vec2<f32>
{
	var p3: vec3<f32>  = fract(vec3(p.xyx) * MOD3);
    p3 += dot(p3, p3.yzx+19.19);
    return fract(vec2((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y));
}

fn linearize_depth_ndc(ndc_z: f32, z_near: f32, z_far: f32) -> f32 {
    return z_near * z_far / (z_far - ndc_z * (z_far - z_near));
}

fn getPosition(uv : vec2<f32>) -> vec3<f32>
{
    var fl:f32 = 1.0;
    var d:f32 = textureSample(tex, mySampler, uv);
    d = linearize_depth_ndc(d, 0.05, 10000);

    var p : vec2<f32> = uv;
    var ca :mat3x3<f32>  = mat3x3<f32>(1.,0.,0.,0.,1.,0.,0.,0.,-1./1.5);
    var rd : vec3<f32> = normalize( ca * vec3(p,fl) );

	var pos : vec3<f32> = rd * d;
    return pos;
}

fn getRandom(uv : vec2<f32>) -> vec2<f32> {
    return normalize(hash22(uv*126.1231) * 2. - 1.);
}


fn doAmbientOcclusion(tcoord:vec2<f32>,  uv:vec2<f32>,  p:vec3<f32>,  cnorm:vec3<f32>) -> f32
{
    var diff:vec3<f32> = getPosition(tcoord + uv) - p;
    var l: f32 = length(diff);
    var v:vec3<f32> = diff/l;
    var d: f32 = l*SCALE;
    var ao : f32 = max(0.0,dot(cnorm,v)-BIAS)*(1.0/(1.0+d));
    ao *= smoothstep(MAX_DISTANCE * 0.5, MAX_DISTANCE, l);
    return ao;

}

fn spiralAO( uv:vec2<f32>,  p:vec3<f32>,  n:vec3<f32>,  rad: f32) -> f32
{
    var goldenAngle : f32 = 2.4;
    var ao : f32 = 0.;
    var inv : f32 = 1. / f32(SAMPLES1);
    var radius : f32 = 0.;

    var rotatePhase: f32 = hash12( uv*100. ) * 6.28;
    var rStep: f32 = inv * rad;
    var spiralUV: vec2<f32>;

    for (var i = 0.0; i < SAMPLES1; i += 1.0) {
        spiralUV.x = sin(rotatePhase);
        spiralUV.y = cos(rotatePhase);
        radius += rStep;
        ao += doAmbientOcclusion(uv, spiralUV * radius, p, n);
        rotatePhase += goldenAngle;
    }
    ao *= inv;
    return ao;
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
    var temp = textureSample(tex,mySampler, uvs);
    var col : f32;
    var outTex = textureSample(texColor, mySampler, uvs);
    if (temp == 1.0) {
        col = temp * 0.25;
    }
    // Jittering, to get rid of banding. Vitally important when accumulating discontinuous
    // samples, especially when only a few layers are being used.
    uvs += dTuv*(hash(uvs.xy - 1.0) * 2. - 1.);

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

    uvs = uv;
    uvs.y = 1.0 - uvs.y;

    var p = getPosition(uvs);
    var n = outTex.xyz;
    //var n = vec3(1.0,1.0,1.0);

    var ao = 0.;
    var rad = SAMPLE_RAD/p.z;

    ao = spiralAO(uvs, p, n, rad);

    ao = 1. - ao * INTENSITY;

    //temp = linearize_depth_ndc(temp, 0.05, 10000)/256;
    //return vec4(temp,temp,temp,1.);
    //return vec4(ao,ao,ao,1.);

    if (temp == 1.0) {
        return outTex;
    }
    //return vec4(ao,ao,ao,1.);
     outTex *= vec4(ao,ao,ao,1.0);

    // Multiplying the final color with a spotlight centered on the focal point of the radial
    // blur. It's a nice finishing touch... that Passion came up with. If it's a good idea,
    // it didn't come from me. :)
    col *= (1. - dot(tuv, tuv)*.75);

    // Smoothstepping the final color, just to bring it out a bit, then applying some
    // loose gamma correction.

    return outTex + sqrt(smoothstep(0.0, 1.0, col));
}
