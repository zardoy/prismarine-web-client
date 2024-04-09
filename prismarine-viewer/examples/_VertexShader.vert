#version 300 es
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in float CubeSide;

layout (location = 3) in vec3 aOffset;
layout (location = 4) in float aTextureIndex;
layout (location = 6) in vec3 aBiomeColor;

//#Define 

out vec2 TexCoord;
flat out float TextureIndex;
flat out vec3 BiomeColor;

uniform mat4 view;
uniform mat4 projection;
uniform int tick;

mat4 rotationX( in float angle ) {
	return mat4(	1.0,		0,			0,			0,
			 		0, 	cos(angle),	-sin(angle),		0,
					0, 	sin(angle),	 cos(angle),		0,
					0, 			0,			  0, 		1);
}

mat4 rotationY( in float angle ) {
	return mat4(	cos(angle),		0,		sin(angle),	0,
			 				0,		1.0,			 0,	0,
					-sin(angle),	0,		cos(angle),	0,
							0, 		0,				0,	1);
}

void main()
{
    //vec3 TransitionedPos = aPos;
    vec3 TransitionedPos ;//= (vec4(aPos,0.0f) *rotationX(radians(180.0f))).xyz;

    TexCoord = vec2(aTexCoord.x, (1.0 - aTexCoord.y)); // Flipping image for opengl coordinates
    TextureIndex = aTextureIndex; //Passing texture index to fragment shader
    switch (int(CubeSide)) {
        case 0:
            TexCoord = vec2((1.0f-aTexCoord.x), (1.0 - aTexCoord.y));
            //TextureIndex = aTextureIndex.x;
            //TransitionedPos = (vec4(aPos,0.0f) *rotationY(radians(90.0f))).xyz;
            
            TransitionedPos = (vec4(aPos,0.0f) *rotationX(radians(-90.0f))).xyz;
            break;
        case 1:
            //TextureIndex = aTextureIndex.y;
            TransitionedPos = (vec4(aPos,0.0f) *rotationX(radians(90.0f))).xyz;
            break;
        case 2:
            //TextureIndex = aTextureIndex.z;
            //TexCoord = vec2((1.0f-aTexCoord.y), (1.0f - aTexCoord.x));
            TransitionedPos = vec4(aPos,0.0f).xyz;
            break;
        case 3:
            //TextureIndex = aTextureIndex.z;
            //TexCoord = vec2(aTexCoord.y, (1.0f - aTexCoord.x));
            
            //TransitionedPos = (vec4(aPos,0.0f) *rotationX(radians(-90.0f))).xyz;
            TransitionedPos = (vec4(aPos,0.0f) *rotationY(radians(90.0f))).xyz;
            break;
        case 4:
            //TextureIndex = aTextureIndexPlus.x;
            //TransitionedPos = vec4(aPos,0.0f).xyz;
            TransitionedPos = (vec4(aPos,0.0f) *rotationY(radians(-90.0f))).xyz;
            break;
        case 5:
            //TextureIndex = aTextureIndexPlus.y;
            //TransitionedPos = vec4(aPos,0.0f).xyz;
            TexCoord = vec2(aTexCoord);
            TransitionedPos = (vec4(aPos,0.0f) *rotationX(radians(180.0f))).xyz;
            break;
    }
    TextureIndex += float(tick);

    BiomeColor = aBiomeColor;

    gl_Position = projection * view * vec4(TransitionedPos + aOffset + vec3(0.5f,0.5f,0.5f), 1.0f); //Offseting by 0.5 to center the cube
    //CubeSideIndex = CubeSide; //Passing cube side index to fragment shader
}
