// Renders a small PNG thumbnail of a .glb, used for the cards on the assets page.
// One shared WebGL renderer, one model at a time, results cached for the session.
// three.js is only loaded the first time a thumbnail is actually needed.

const SIZE = 256

let THREE, loader, renderer, scene, camera
const cache = new Map()
let chain = Promise.resolve()

async function setup() {
  if (renderer) return
  THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  loader = new GLTFLoader()

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SIZE, SIZE)
  renderer.setClearColor(0x000000, 0) // transparent background

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000)
  scene.add(new THREE.AmbientLight(0xffffff, 1.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1.8)
  dir.position.set(3, 5, 4)
  scene.add(dir)
}

function disposeModel(model) {
  model.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach(m => { m.map?.dispose(); m.dispose() })
    }
  })
}

async function shoot(url, { unlit = true, brightness = 1.4 } = {}) {
  await setup()
  const gltf = await loader.loadAsync(url)
  const model = gltf.scene

  // first frame of the baked animation, same as the viewer starts with
  if (gltf.animations && gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(model)
    mixer.clipAction(gltf.animations[0]).play()
    mixer.update(0)
  }

  // same flat, bright look as the viewer
  if (unlit) {
    model.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        const old = Array.isArray(o.material) ? o.material[0] : o.material
        if (old.map) old.map.colorSpace = THREE.SRGBColorSpace
        o.material = new THREE.MeshBasicMaterial({
          map: old.map || null,
          color: old.map ? new THREE.Color(brightness, brightness, brightness) : old.color,
          transparent: old.transparent,
          opacity: old.opacity,
          alphaTest: old.alphaTest,
          side: THREE.DoubleSide
        })
      }
    })
  }

  // center it, turn it a bit so it reads as 3D, and frame the camera
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3()).length()
  if (!isFinite(size) || size === 0) throw new Error('empty model')
  model.position.sub(center)

  const pivot = new THREE.Group()
  pivot.add(model)
  pivot.rotation.y = -0.6
  scene.add(pivot)

  camera.position.set(0, size * 0.2, size * 1.05)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
  const png = renderer.domElement.toDataURL('image/png')

  scene.remove(pivot)
  disposeModel(model)
  return png
}

// Returns a promise for a data-URL PNG, or '' if the model couldn't be rendered.
export function getThumb(url, opts) {
  if (cache.has(url)) return cache.get(url)
  const p = chain
    .then(() => shoot(url, opts))
    .catch(e => { console.warn('[modelThumb] could not render', url, e); return '' })
  chain = p // always resolves, so one bad model never blocks the queue
  cache.set(url, p)
  return p
}
