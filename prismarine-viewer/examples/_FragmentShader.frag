#version 300 es
precision highp float;
out vec4 FragColor;

in vec2 TexCoord;
flat in float TextureIndex;

uniform sampler2D texture1;

//uniform vec2 uv;
//uniform vec2 suv;

void main()
{

	//vec2 position = vec2(1, 1);	// I assume gets tile at (1, 1) since the size of the tiles are 1/16


    ivec2 texSize = textureSize(texture1,0 );
    float texWidth = float(texSize.x);
	vec2 size = vec2(16.0f/texWidth, 16.0f/texWidth);
    vec2 coord = size * vec2(int(TextureIndex)%32,int(TextureIndex)/32) + TexCoord * (1.0f/32.0f);

    FragColor = texture(texture1, coord);
}
