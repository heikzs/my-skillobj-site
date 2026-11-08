<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  src: { type: String, required: true },   // zip, used for the Download button
  glb: { type: String, default: '' },      // .glb for mode 1 (leave off = no preview)
  glb2: { type: String, default: '' },     // optional second .glb (mode 2)
  label: { type: String, default: 'Mode 1' },  // button text for mode 1
  label2: { type: String, default: 'Mode 2' }, // button text for mode 2
  modes: { type: Array, default: () => [] }, // any number of modes: [{ label: 'Closed', glb: '/models/a.glb' }, ...]
  hide: { type: String, default: '' },     // comma-separated mesh names to remove
  unlit: { type: Boolean, default: false },// flat bright look, ignores lights
  anim: { type: Number, default: 0 },      // which animation clip to play (0 = first)
  brightness: { type: Number, default: 1 },// multiplies texture color when unlit (try 1.3 - 1.8)
  raw: { type: Boolean, default: false }
})

const open = ref(false)
const loading = ref(false)
const error = ref('')
const noPreview = ref(false)
const current = ref(1)
const canvasWrap = ref(null)

// one list of modes, built from "modes", or from glb/glb2 for the simple cases
const list = computed(() => {
  if (props.modes.length) return props.modes.filter(m => m && m.glb)
  const out = []
  if (props.glb) out.push({ label: props.label, glb: props.glb })
  if (props.glb2) out.push({ label: props.label2, glb: props.glb2 })
  return out
})

let THREE, loader
let renderer, scene, camera, controls, frameId, resizeObs, mixer, clock
let currentModel = null
let loadId = 0

let savedY = 0
function lockScroll() {
  savedY = window.scrollY
  document.documentElement.style.overflow = 'hidden'
}
function unlockScroll() {
  document.documentElement.style.overflow = ''
  window.scrollTo(0, savedY)
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

async function showModel(n) {
  const url = list.value[n - 1].glb
  const myId = ++loadId
  current.value = n
  loading.value = true
  error.value = ''

  try {
    const gltf = await loader.loadAsync(url)
    if (myId !== loadId || !scene) return // closed or switched again while loading
    const model = gltf.scene

    // remove the previous model
    if (currentModel) {
      scene.remove(currentModel)
      disposeModel(currentModel)
      currentModel = null
    }
    mixer?.stopAllAction()
    mixer = null

    // play the animation baked into the .glb (if any)
    if (gltf.animations && gltf.animations.length) {
      console.log('[ModelViewer] animations:', gltf.animations.map(a => a.name))
      mixer = new THREE.AnimationMixer(model)
      const clip = gltf.animations[props.anim] || gltf.animations[0]
      mixer.clipAction(clip).play()
    }

    // remove meshes listed in "hide"
    const hideList = props.hide.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    const toRemove = []
    model.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        console.log('[ModelViewer] mesh:', JSON.stringify(o.name))
        if (hideList.includes(o.name.toLowerCase())) toRemove.push(o)
      }
    })
    toRemove.forEach(o => o.parent && o.parent.remove(o))

    // unlit: flat material that ignores lighting (keeps the texture)
    if (props.unlit) {
      model.traverse(o => {
        if (o.isMesh || o.isSkinnedMesh) {
          const old = Array.isArray(o.material) ? o.material[0] : o.material
          if (old.map) old.map.colorSpace = THREE.SRGBColorSpace
          o.material = new THREE.MeshBasicMaterial({
            map: old.map || null,
            color: old.map ? new THREE.Color(props.brightness, props.brightness, props.brightness) : old.color,
            transparent: old.transparent,
            opacity: old.opacity,
            alphaTest: old.alphaTest,
            side: THREE.DoubleSide
          })
        }
      })
    }

    // center the model and fit the camera
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3()).length()
    model.position.sub(center)
    scene.add(model)
    currentModel = model
    camera.position.set(0, size * 0.2, size * 1.1)
    controls.target.set(0, 0, 0)
    controls.update()

    loading.value = false
  } catch (e) {
    if (myId !== loadId) return
    console.error(e)
    error.value = e.message || 'Could not load model'
    loading.value = false
  }
}

function switchTo(n) {
  if (n === current.value || !scene || !list.value[n - 1]) return
  showModel(n)
}

async function openViewer() {
  lockScroll()
  open.value = true
  error.value = ''
  noPreview.value = list.value.length === 0
  if (noPreview.value) {
    loading.value = false
    return
  }
  loading.value = true
  await nextTick()

  try {
    THREE = await import('three')
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    loader = new GLTFLoader()

    const el = canvasWrap.value
    if (!el) return // closed while loading
    clock = new THREE.Clock()
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.01, 5000)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const dir = new THREE.DirectionalLight(0xffffff, 1.8)
    dir.position.set(3, 5, 4)
    scene.add(dir)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 2

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (mixer) mixer.update(clock.getDelta())
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    resizeObs = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    resizeObs.observe(el)

    await showModel(1)
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Could not load model'
    loading.value = false
  }
}

function cleanup() {
  loadId++ // cancel any load in progress
  cancelAnimationFrame(frameId)
  resizeObs?.disconnect()
  controls?.dispose()
  if (currentModel) disposeModel(currentModel)
  currentModel = null
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
  mixer?.stopAllAction()
  mixer = clock = null
  renderer = scene = camera = controls = null
}

function close() {
  open.value = false
  cleanup()
  unlockScroll()
}

onBeforeUnmount(() => {
  cleanup()
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <span class="mv-item">
    <a role="button" tabindex="0" style="cursor: pointer" @click.prevent.stop="openViewer" @keydown.enter.prevent="openViewer">{{ name }}</a>
    <span v-if="raw"> - raw</span>
  </span>

  <Teleport to="body">
    <div v-if="open" class="mv-overlay" @click.self="close">
      <div class="mv-modal">
        <div class="mv-head">
          <strong>{{ name }}</strong>
          <span v-if="list.length > 1" class="mv-tabs">
            <button
              v-for="(m, i) in list"
              :key="i"
              :class="{ active: current === i + 1 }"
              @click="switchTo(i + 1)"
            >{{ m.label || 'Mode ' + (i + 1) }}</button>
          </span>
          <span class="mv-actions">
            <button class="mv-close" @click="close">✕</button>
          </span>
        </div>
        <div ref="canvasWrap" class="mv-canvas">
          <div v-if="noPreview" class="mv-msg">no preview ueue ૮◞ ‸ ◟ ა</div>
          <div v-if="loading" class="mv-msg">loading model…</div>
          <div v-if="error" class="mv-msg mv-err">{{ error }}</div>
        </div>
        <div class="mv-foot">
          <a :href="src" download class="mv-dl">Download</a>
        </div>
        <div v-if="!noPreview" class="mv-warn">This is just a preview. The look inside .blend file may be different</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mv-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
}
.mv-modal {
  width: min(720px, 94vw);
  background: var(--vp-c-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}
.mv-head {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.mv-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-right: auto; margin-left: 6px; }
.mv-tabs button {
  padding: 3px 12px;
  font-size: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.mv-tabs button.active {
  border-color: #eea5a5;
  background: #eea5a5;
  color: #fff;
}
.mv-actions { display: flex; gap: 12px; align-items: center; }
.mv-dl {
  padding: 4px 14px;
  font-size: 13px;
  border: 1px solid #eea5a5;
  color: #eea5a5;
  border-radius: 14px;
  text-decoration: none;
}
.mv-dl:hover { background: #eea5a5; color: #fff; }
.mv-foot { display: flex; justify-content: center; padding: 10px 0 4px; }
.mv-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--vp-c-text-1); }
.mv-canvas { position: relative; width: 100%; height: 420px; }
.mv-msg {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--vp-c-text-2);
  pointer-events: none;
}
.mv-err { color: #e66; }
.mv-hint { text-align: center; font-size: 12px; padding: 6px 6px 2px; color: var(--vp-c-text-3); }
.mv-warn { text-align: center; font-size: 12px; padding: 2px 12px 10px; color: #eea5a5; }
</style>