layout (location = 0) in vec3 aPos;

varying vec2 vUv;

void main()	{

    vUv = uv;

    gl_Position = vec4( aPos, 1.0 );

}