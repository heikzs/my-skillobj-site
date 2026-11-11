<script>
// Shared by every ModelViewer on the page (a normal <script> runs once per module, not per card).
// Thumbnails are rendered one at a time, when the browser is idle, and not while a card is still
// expanding. Before this, every card started a WebGL render at once and the page stuttered.
let chain = Promise.resolve()
let startAfter = 0
const sleep = ms => new Promise(r => setTimeout(r, ms))
const idle = () => new Promise(r =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(() => r(), { timeout: 60 }) : setTimeout(r, 0)
)
function enqueue(fn) {
  const run = chain.then(async () => {
    const wait = startAfter - performance.now()
    if (wait > 0) await sleep(wait)
    await idle()
    return fn()
  })
  chain = run.catch(() => {})
  return run
}
function holdThumbs(ms) { startAfter = Math.max(startAfter, performance.now() + ms) }

// ---- thumbnail cache that survives page reloads (IndexedDB) ----
// First visit renders each thumbnail once; every visit after that is instant. Bump THUMB_V if you
// change a model or the look (unlit / brightness) and want fresh thumbnails.
const THUMB_V = 'v1'
let dbp = null
function getDb() {
  return (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('mv-thumbs', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('t')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }))
}
async function idbGet(k) {
  try {
    const d = await getDb()
    const v = await new Promise(res => {
      const q = d.transaction('t').objectStore('t').get(k)
      q.onsuccess = () => res(q.result || null)
      q.onerror = () => res(null)
    })
    return v instanceof Blob ? URL.createObjectURL(v) : v
  } catch (_) { return null }
}
async function idbSet(k, url) {
  try {
    const v = url.startsWith('blob:') ? await (await fetch(url)).blob() : url
    const d = await getDb()
    d.transaction('t', 'readwrite').objectStore('t').put(v, k)
  } catch (_) { /* cache is optional */ }
}
async function thumbFor(glb, opts) {
  const key = `${THUMB_V}|${glb}|${opts.unlit ? 1 : 0}|${opts.brightness}`
  const hit = await idbGet(key)
  if (hit) return hit // instant: no WebGL, no queue
  holdThumbs(300) // brief pause so a card that is still expanding doesn't stutter
  const { getThumb } = await import('./modelThumb.js')
  const url = await enqueue(() => getThumb(glb, opts))
  if (url) idbSet(key, url)
  return url
}

// download three.js in the background the first time a card is hovered, so opening feels instant
let prefetched = false
function prefetchThree() {
  if (prefetched) return
  prefetched = true
  import('three')
  import('three/examples/jsm/controls/OrbitControls.js')
  import('three/examples/jsm/loaders/GLTFLoader.js')
}
</script>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  name: { type: String, required: true },
  src: { type: String, default: '' },      // zip, used for the Download button (empty = no download)
  glb: { type: String, default: '' },      // .glb for mode 1 (leave off = no preview)
  glb2: { type: String, default: '' },     // optional second .glb (mode 2)
  label: { type: String, default: 'Mode 1' },  // button text for mode 1
  label2: { type: String, default: 'Mode 2' }, // button text for mode 2
  modes: { type: Array, default: () => [] }, // any number of modes: [{ label: 'Closed', glb: '/models/a.glb' }, ...]
  hide: { type: String, default: '' },     // comma-separated mesh names to remove
  unlit: { type: Boolean, default: false },// flat bright look, ignores lights
  anim: { type: Number, default: 0 },      // which animation clip to play (0 = first)
  brightness: { type: Number, default: 1 },// multiplies texture color when unlit (try 1.3 - 1.8)
  raw: { type: Boolean, default: false },  // zip only, shows a "raw" badge
  tag: { type: String, default: '' },      // optional extra pill on the card, e.g. "weapon"
  card: { type: Boolean, default: false }, // render as a clickable card instead of an inline link
  thumb: { type: String, default: '' }     // optional image for the card; leave empty to render one from the .glb
})

const badge = computed(() => {
  if (list.value.length > 1) return `${list.value.length} modes`
  if (list.value.length === 1) return '' // single model = plain 3D, no tag needed
  return 'no preview'
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

// card thumbnail: rendered from the model the first time the card scrolls into view
const cardEl = ref(null)
const thumbUrl = ref(props.thumb)
let io = null

onMounted(() => {
  if (!props.card || props.thumb || !list.value.length) return
  if (typeof IntersectionObserver === 'undefined' || !cardEl.value) return
  io = new IntersectionObserver(async entries => {
    if (!entries.some(e => e.isIntersecting)) return
    io.disconnect()
    io = null
    try {
      const url = await thumbFor(list.value[0].glb, { unlit: props.unlit, brightness: props.brightness })
      if (url) thumbUrl.value = url
    } catch (e) {
      console.warn('[ModelViewer] no thumbnail', e)
    }
  }, { rootMargin: '200px' })
  io.observe(cardEl.value)
})

// small picture of each mode, shown in the side column of the viewer
const modeThumbs = ref({})
function modeLabel(m, i) {
  const l = String((m && m.label) || i + 1)
  return /^\d+$/.test(l) ? `mode ${l}` : l
}
async function loadModeThumbs() {
  if (list.value.length < 2) return
  try {
    for (let i = 0; i < list.value.length; i++) {
      if (!open.value) return
      if (modeThumbs.value[i]) continue
      const url = await thumbFor(list.value[i].glb, { unlit: props.unlit, brightness: props.brightness })
      if (url) modeThumbs.value[i] = url
    }
  } catch (e) {
    console.warn('[ModelViewer] no mode thumbnails', e)
  }
}

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
  if (renderer) cleanup() // reopened while the previous close animation was still running
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 3x screens render 2.25x the pixels for no visible gain
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
    loadModeThumbs() // only after the model is on screen, one at a time
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
  unlockScroll()
  // the 3D scene is torn down in onAfterLeave so the model stays visible while the modal fades out
}

function onAfterLeave() {
  if (!open.value) cleanup()
}

onBeforeUnmount(() => {
  io?.disconnect()
  cleanup()
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <button v-if="card" ref="cardEl" type="button" class="mv-card" @click="openViewer" @pointerenter.once="prefetchThree" @focus.once="prefetchThree">
    <span class="mv-card-thumb">
      <img v-if="thumbUrl" :src="thumbUrl" alt="" />
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </svg>
    </span>
    <span class="mv-card-name">{{ name }}</span>
    <span class="mv-card-badges">
      <span v-if="badge" class="mv-pill" :class="{ dim: !list.length }">{{ badge }}</span>
      <span v-if="raw" class="mv-pill raw">raw</span>
      <span v-if="tag" class="mv-pill tag">{{ tag }}</span>
    </span>
  </button>
  <span v-else class="mv-item">
    <a role="button" tabindex="0" style="cursor: pointer" @click.prevent.stop="openViewer" @keydown.enter.prevent="openViewer">{{ name }}</a>
    <span v-if="raw"> - raw</span>
  </span>

  <Teleport to="body">
   <Transition name="mv" @after-leave="onAfterLeave">
    <div v-if="open" class="mv-overlay" @click.self="close">
      <div class="mv-modal">
        <div class="mv-head">
          <strong>{{ name }}</strong>
          <span class="mv-actions">
            <button class="mv-close" @click="close">✕</button>
          </span>
        </div>
        <div class="mv-body">
          <div v-if="list.length > 1" class="mv-side">
            <button
              v-for="(m, i) in list"
              :key="i"
              type="button"
              class="mv-mode"
              :style="{ '--i': i }"
              :class="{ active: current === i + 1 }"
              @click="switchTo(i + 1)"
            >
              <span class="mv-mode-img">
                <img v-if="modeThumbs[i]" :src="modeThumbs[i]" alt="" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
                </svg>
              </span>
              <span class="mv-mode-label">{{ modeLabel(m, i) }}</span>
            </button>
          </div>
          <div ref="canvasWrap" class="mv-canvas">
            <div v-if="noPreview" class="mv-msg">no preview ueue ૮◞ ‸ ◟ ა</div>
            <div v-if="loading" class="mv-msg">Investigating model...</div>
            <div v-if="error" class="mv-msg mv-err">{{ error }}</div>
          </div>
        </div>
        <div class="mv-foot">
          <a v-if="src" :href="src" download class="mv-dl">Download</a>
          <span v-else class="mv-nodl">download not uploaded yet</span>
        </div>
        <div v-if="!noPreview" class="mv-warn">This is just a preview. The look inside .blend file may be different</div>
      </div>
    </div>
   </Transition>
  </Teleport>
</template>

<style scoped>
/* ---- card ---- */
.mv-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 124px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  text-align: left;
  font: inherit;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.mv-card:hover,
.mv-card:focus-visible {
  transform: translateY(-4px);
  border-color: var(--ag-accent);
  box-shadow: 0 8px 20px var(--ag-accent-glow);
  outline: none;
}
.mv-card-thumb {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.mv-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
  transition: transform 0.25s ease;
}
.mv-card:hover .mv-card-thumb img { transform: scale(1.1) rotate(-3deg); }
/* the thumbnail fades in when it arrives instead of popping in */
.mv-card-thumb img { animation: mv-thumb-in 0.35s ease backwards; }
@keyframes mv-thumb-in { from { opacity: 0; } to { opacity: 1; } }
.mv-card-thumb svg { width: 34px; height: 34px; color: var(--vp-c-text-1); opacity: 0.16; }
.mv-card-name {
  position: relative;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.3;
  word-break: break-word;
  max-width: calc(100% - 70px);
}
.mv-card-badges { position: relative; display: flex; flex-wrap: wrap; gap: 5px; max-width: calc(100% - 78px); }
.mv-pill {
  padding: 1px 9px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 10px;
  color: var(--ag-accent-text);
  background: var(--ag-accent-soft);
}
.mv-pill.dim { color: var(--vp-c-text-3); background: var(--vp-c-default-soft); }
.mv-pill.raw { color: #fff; background: var(--ag-accent); }
.mv-pill.tag { color: var(--ag-accent-text); background: transparent; border: 1px solid var(--ag-accent); line-height: 16px; }
.mv-nodl { font-size: 13px; color: var(--vp-c-text-3); }

/* ---- modal ---- */
.mv-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
}

/* open / close: backdrop fades, the modal fades up (opacity + transform only, so it stays smooth) */
.mv-enter-active, .mv-leave-active { transition: opacity 0.24s ease; }
.mv-enter-from, .mv-leave-to { opacity: 0; }
.mv-enter-active .mv-modal { transition: transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1); }
.mv-leave-active .mv-modal { transition: transform 0.24s ease; }
.mv-enter-from .mv-modal { transform: translateY(24px) scale(0.97); }
.mv-leave-to .mv-modal { transform: translateY(12px) scale(0.98); }

/* mode thumbnails rise in one after another, and the canvas fades in when the model appears */
.mv-mode { animation: mv-rise 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 60ms + 180ms); }
@keyframes mv-rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.mv-canvas :deep(canvas) { animation: mv-fade 0.5s ease backwards; }
@keyframes mv-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .mv-enter-active, .mv-leave-active, .mv-enter-active .mv-modal, .mv-leave-active .mv-modal { transition: none; }
  .mv-mode, .mv-canvas :deep(canvas) { animation: none; }
}

.mv-modal {
  width: min(500px, 94vw);
  background: var(--vp-c-bg);
  border: 1px solid rgba(166, 104, 118, 0.55);
  border-radius: 20px;
  overflow: hidden;

  box-shadow:
    0 0 0 1px rgba(137, 62, 84, 0.15),
    0 12px 40px rgba(0, 0, 0, 0.4),
    0 0 25px rgba(137, 62, 84, 0.15);
}
.mv-head {
  background: rgba(137, 62, 84, 0.12);
  border-bottom: 1px solid rgba(166, 104, 118, 0.3);
  padding: 14px 18px;
}
.mv-body { display: flex; }
.mv-side {
  flex: none;
  width: 98px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  overflow-y: auto;
  order: 2; /* modes list sits on the right of the preview */
  border-left: 1px solid var(--vp-c-divider);
}
.mv-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 8px;
  font: inherit;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.mv-mode:hover { border-color: var(--ag-accent); }
.mv-mode.active { border-color: var(--ag-accent); box-shadow: 0 0 0 1px var(--ag-accent), 0 4px 12px var(--ag-accent-glow); }
.mv-mode-img { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; }
.mv-mode-img img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35)); }
.mv-mode-img svg { width: 28px; height: 28px; color: var(--vp-c-text-1); opacity: 0.16; }
.mv-mode-label {
  padding: 0 9px;
  font-size: 11px;
  line-height: 18px;
  color: var(--ag-accent-text);
  background: var(--ag-accent-soft);
  border-radius: 10px;
}
.mv-mode.active .mv-mode-label { color: #fff; background: var(--ag-accent); }
@media (max-width: 520px) {
  .mv-side { width: 78px; padding: 10px 6px; }
  .mv-mode-img { width: 50px; height: 50px; }
}
.mv-actions { display: flex; gap: 12px; align-items: center; }
.mv-dl {
  padding: 4px 14px;
  font-size: 13px;
  border: 1px solid var(--ag-accent);
  color: var(--ag-accent-text);
  border-radius: 14px;
  text-decoration: none;
}
.mv-dl:hover { background: var(--ag-accent); color: #fff; }
.mv-foot { display: flex; justify-content: center; padding: 10px 0 4px; }
.mv-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--vp-c-text-1); }

.mv-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 420px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 45%,
      rgba(166, 104, 118, 0.24),
      transparent 55%
    ),
    linear-gradient(
      145deg,
      #291c23,
      #39232e 55%,
      #211a20
    );
}

.mv-msg {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--vp-c-text-2);
  pointer-events: none;
}
.mv-err { color: #e66; }
.mv-hint { text-align: center; font-size: 12px; padding: 6px 6px 2px; color: var(--vp-c-text-3); }
.mv-warn { text-align: center; font-size: 12px; padding: 2px 12px 10px; color: var(--ag-accent-text); }
</style>

<!-- Theme colors for the assets gallery. Change these three to recolor everything. -->
<style>
:root {
  --ag-accent: #893e54;                    /* fills, borders, active chips */
  --ag-accent-text: #893e54;               /* accent used as text color (light mode) */
  --ag-accent-soft: rgba(137, 62, 84, 0.14);
  --ag-accent-glow: rgba(137, 62, 84, 0.35);
}
/* #893e54 is too dark to read as text on a dark background, so text uses a lighter tint there */
:root.dark {
  --ag-accent-text: #d9a0b3;
  --ag-accent-soft: rgba(137, 62, 84, 0.38);
  --ag-accent-glow: rgba(137, 62, 84, 0.6);
}
</style>
