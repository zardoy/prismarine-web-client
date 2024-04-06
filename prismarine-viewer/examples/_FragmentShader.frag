#version 300 es
precision highp float;

out vec4 FragColor;

in vec2 TexCoord;
flat in float TextureIndex;
flat in vec3 BiomeColor;

uniform sampler2D texture1;

void main()
{
    ivec2 texSize = textureSize(texture1, 0);
    int TilesPerRow = texSize.x / 16;

    ivec2 coord = ivec2(16,16) * ivec2(int(TextureIndex)%TilesPerRow,int(TextureIndex)/TilesPerRow);
    coord = coord + ivec2(TexCoord * 16.0f);

    vec4 t = texelFetch(texture1, coord, 0);
    if (abs(t.x-t.y) <=0.010 || abs(t.x-t.z)<=0.010 ||abs(t.y-t.z) <=0.010) 
    {
        FragColor = vec4(BiomeColor,1.0f)*t;
    }
    else 
    {
        FragColor = t;
        //FragColor = mix(t, vec4(BiomeColor, 1.0f), 0.5f);
    }
    
}
