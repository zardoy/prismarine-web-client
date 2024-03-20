#version 300 es
precision highp float;
out vec4 FragColor;

in vec2 TexCoord;

uniform sampler2D texture1;
uniform sampler2D texture2;

uniform vec2 uv;
uniform vec2 suv;

void main()
{
	vec2 position = vec2(1, 1);	// I assume gets tile at (1, 1) since the size of the tiles are 1/16
	vec2 size = vec2(1/64, 1/64);
    vec2 coord = uv + TexCoord * (1.0f/64.0f);

    FragColor = mix(texture(texture1, coord), texture(texture2, coord), 1.0);
}
