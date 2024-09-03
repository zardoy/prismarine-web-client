import * as THREE from 'three'
import * as tweenJs  from '@tweenjs/tween.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three';
import Jimp from 'jimp';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 5)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
cube.position.set(0.5, 0.5, 0.5);
const group = new THREE.Group()
group.add(cube)
group.position.set(-0.5, -0.5, -0.5);
const outerGroup = new THREE.Group()
outerGroup.add(group)
outerGroup.scale.set(0.2, 0.2, 0.2)
outerGroup.position.set(1, 1, 0)
scene.add(outerGroup)

// const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00_00_ff, transparent: true, opacity: 0.5 }))
//     mesh.position.set(0.5, 1, 0.5)
//     const group = new THREE.Group()
//     group.add(mesh)
//     group.position.set(-0.5, -1, -0.5)
//     const outerGroup = new THREE.Group()
//     outerGroup.add(group)
//     // outerGroup.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z)
//     scene.add(outerGroup)

    new tweenJs.Tween(group.rotation).to({ z: THREE.MathUtils.degToRad(90) }, 1000).yoyo(true).repeat(Infinity).start()

const tweenGroup = new tweenJs.Group()
function animate () {
    tweenGroup.update()
  requestAnimationFrame(animate)
//   cube.rotation.x += 0.01
//   cube.rotation.y += 0.01
  renderer.render(scene, camera)
}
animate()

// let animation

window.animate = () => {
    // new Tween.Tween(group.position).to({ y: group.position.y - 1}, 1000 * 0.35/2).yoyo(true).repeat(1).start()
    new tweenJs.Tween(group.rotation, tweenGroup).to({ z: THREE.MathUtils.degToRad(90) }, 1000 * 0.35 / 2).yoyo(true).repeat(Infinity).start().onRepeat(() => {
        console.log('done')
    })
}

window.stop = () => {
    tweenGroup.removeAll()
}


function createGeometryFromImage() {
    return new Promise<THREE.ShapeGeometry>((resolve, reject) => {
        const img = new Image();
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAABEElEQVQ4jWNkIAPw2Zv9J0cfXPOSvx/+L/n74T+HqsJ/JlI1T9u3i6H91B7ybdY+vgZuO1majV+fppFmPnuz/+ihy2dv9t/49Wm8mlECkV1FHh5FfPZm/1XXTGX4cechA4eKPMNVq1CGH7cfMBJ0rlxX+X8OVYX/xq9P/5frKifoZ0Z0AwS8HRkYGBgYvt+8xyDXUUbQZgwJPnuz/+wq8gw/7zxk+PXsFUFno0h6mon+l5fgZFhwnYmBTUqMgYGBgaAhLMiaHQyFGOZvf8Lw49FXRgYGhv8MDAwwg/7jMoQFFury/C8Y5m9/wnADohnZVryJhoWBARJ9Cw69gtmMAgiFAcuvZ68Yfj17hU8NXgAATdKfkzbQhBEAAAAASUVORK5CYII='
        console.log('img.complete', img.complete)
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, img.width, img.height);
            const imgData = context.getImageData(0, 0, img.width, img.height);

            const shape = new THREE.Shape();
            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const index = (y * img.width + x) * 4;
                    const alpha = imgData.data[index + 3];
                    if (alpha !== 0) {
                        shape.lineTo(x, y);
                    }
                }
            }

            const geometry = new THREE.ShapeGeometry(shape);
            resolve(geometry);
        };
        img.onerror = reject;
    });
}

// Usage:
const shapeGeomtry = createGeometryFromImage().then(geometry => {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
})
