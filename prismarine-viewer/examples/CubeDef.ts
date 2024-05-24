export const cubeVertexSize = 4 * 10 // Byte size of one cube vertex.
export const cubePositionOffset = 0
export const cubeColorOffset = 4 * 4 // Byte offset of cube vertex color attribute.
export const cubeUVOffset = 4 * 8
export const cubeVertexCount = 36

//@ts-format-ignore-region
export const cubeVertexArray = new Float32Array([
    -0.5, -0.5, -0.5, 0.0, 0.0, 0.0, // Bottom-let
    0.5, -0.5, -0.5, 1.0, 0.0, 0.0, // bottom-right
    0.5, 0.5, -0.5, 1.0, 1.0, 0.0, // top-right
    0.5, 0.5, -0.5, 1.0, 1.0, 0.0, // top-right
    -0.5, 0.5, -0.5, 0.0, 1.0, 0.0, // top-let
    -0.5, -0.5, -0.5, 0.0, 0.0, 0.0, // bottom-let
    // ront ace
    -0.5, -0.5, 0.5, 0.0, 0.0, 1.0, // bottom-let
    0.5, 0.5, 0.5, 1.0, 1.0, 1.0, // top-right
    0.5, -0.5, 0.5, 1.0, 0.0, 1.0, // bottom-right
    0.5, 0.5, 0.5, 1.0, 1.0, 1.0,// top-right
    -0.5, -0.5, 0.5, 0.0, 0.0, 1.0,// bottom-let
    -0.5, 0.5, 0.5, 0.0, 1.0, 1.0,// top-let
    // Let ace
    -0.5, 0.5, 0.5, 1.0, 0.0, 2.0,// top-right
    -0.5, -0.5, -0.5, 0.0, 1.0, 2.0,// bottom-let
    -0.5, 0.5, -0.5, 1.0, 1.0, 2.0,// top-let
    -0.5, -0.5, -0.5, 0.0, 1.0, 2.0,// bottom-let
    -0.5, 0.5, 0.5, 1.0, 0.0, 2.0, // top-right
    -0.5, -0.5, 0.5, 0.0, 0.0, 2.0,// bottom-right
    // Right ace
    0.5, 0.5, 0.5, 1.0, 0.0, 3.0,// top-let
    0.5, 0.5, -0.5, 1.0, 1.0, 3.0,// top-right
    0.5, -0.5, -0.5, 0.0, 1.0, 3.0,// bottom-right
    0.5, -0.5, -0.5, 0.0, 1.0, 3.0,// bottom-right
    0.5, -0.5, 0.5, 0.0, 0.0, 3.0,// bottom-let
    0.5, 0.5, 0.5, 1.0, 0.0, 3.0, // top-let
    // Bottom ace
    -0.5, -0.5, -0.5, 0.0, 1.0, 4.0,// top-right
    0.5, -0.5, 0.5, 1.0, 0.0, 4.0,// bottom-let
    0.5, -0.5, -0.5, 1.0, 1.0, 4.0,// top-let
    0.5, -0.5, 0.5, 1.0, 0.0, 4.0, // bottom-let
    -0.5, -0.5, -0.5, 0.0, 1.0, 4.0, // top-right
    -0.5, -0.5, 0.5, 0.0, 0.0, 4.0, // bottom-right
    // Top ace
    -0.5, 0.5, -0.5, 0.0, 1.0, 5.0,// top-let
    0.5, 0.5, -0.5, 1.0, 1.0, 5.0,// top-right
    0.5, 0.5, 0.5, 1.0, 0.0, 5.0,// bottom-right
    0.5, 0.5, 0.5, 1.0, 0.0, 5.0,// bottom-right
    -0.5, 0.5, 0.5, 0.0, 0.0, 5.0,// bottom-let
    -0.5, 0.5, -0.5, 0.0, 1.0, 5.0// top-let˚
]);
