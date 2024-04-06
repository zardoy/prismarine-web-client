#version 300 es
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in float CubeSide;

layout (location = 3) in vec3 aOffset;
layout (location = 4) in vec4 aTextureIndex;
layout (location = 5) in vec2 aTextureIndexPlus;
layout (location = 6) in vec3 aBiomeColor;



out vec2 TexCoord;
flat out float TextureIndex;
flat out vec3 BiomeColor;

uniform mat4 view;
uniform mat4 projection;
uniform int tick;

void main()
{
    gl_Position = projection * view * vec4(aPos + aOffset + vec3(0.5f,0.5f,0.5f), 1.0f); //Offseting by 0.5 to center the cube
    TexCoord = vec2(aTexCoord.x, (1.0 - aTexCoord.y)); // Flipping image for opengl coordinates
    //TextureIndex = aTextureIndex; //Passing texture index to fragment shader
    switch (int(CubeSide)) {
        case 0:
            TexCoord = vec2((1.0f-aTexCoord.x), (1.0 - aTexCoord.y));
            TextureIndex = aTextureIndex.x;
            break;
        case 1:
            TextureIndex = aTextureIndex.y;
            break;
        case 2:
            TextureIndex = aTextureIndex.z;
            TexCoord = vec2((1.0f-aTexCoord.y), (1.0f - aTexCoord.x));
            break;
        case 3:
            TextureIndex = aTextureIndex.z;
            TexCoord = vec2(aTexCoord.y, (1.0f - aTexCoord.x));
            break;
        case 4:
            TextureIndex = aTextureIndexPlus.x;
            break;
        case 5:
            TextureIndex = aTextureIndexPlus.y;
            break;
    }
    TextureIndex += float(tick);

    BiomeColor = aBiomeColor;


    //CubeSideIndex = CubeSide; //Passing cube side index to fragment shader
}
