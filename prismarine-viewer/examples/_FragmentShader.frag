#version 300 es
precision highp float;
out vec4 FragColor;

in vec2 TexCoord;
flat in float TextureIndex;

uniform sampler2D texture1;
uniform sampler2D texture2;

//uniform vec2 uv;
//uniform vec2 suv;

void main()
{
	vec2 position = vec2(1, 1);	// I assume gets tile at (1, 1) since the size of the tiles are 1/16
	vec2 size = vec2(1.0/32.0f, 1.0/32.0f);
    vec2 coord = size * vec2(int(TextureIndex)%32,int(TextureIndex)/32) + TexCoord * (1.0f/32.0f);

    FragColor = mix(texture(texture1, coord), texture(texture2, coord), 1.0);
}
