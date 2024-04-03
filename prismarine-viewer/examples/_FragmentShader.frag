#version 300 es
precision highp float;

out vec4 FragColor;

in vec2 TexCoord;
flat in float TextureIndex;

uniform sampler2D texture1;

void main()
{
    ivec2 texSize = textureSize(texture1, 0);
    int TilesPerRow = texSize.x / 16;

    ivec2 coord = ivec2(16,16) * ivec2(int(TextureIndex)%TilesPerRow,int(TextureIndex)/TilesPerRow);
    coord = coord + ivec2(TexCoord * 16.0f);

    vec4 t = texelFetch(texture1, coord, 0);
    if (t.z < 0.01)
        discard;
    FragColor = t;
}
