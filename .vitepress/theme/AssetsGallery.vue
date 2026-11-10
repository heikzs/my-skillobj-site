<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import ModelViewer from './ModelViewer.vue'
import { withBase } from 'vitepress'
import { characters } from './assets-data.js'

// ---- hover easter eggs: a random chibi peeks out of the card corner ----
// put the files in  docs/public/easter/  (served from /easter/)
const EGGS = [1, 2, 3, 4, 5].map(n => withBase(`/easter/heizou-${n}.png`))
const egg = ref({}) // character id -> { src, left, n }
let eggCount = 0

function pickEgg(id) {
  const prev = egg.value[id]
  let i
  do { i = Math.floor(Math.random() * EGGS.length) } while (EGGS.length > 1 && prev && prev.i === i)
  // new key each hover so the pop-in animation replays
  egg.value[id] = { i, src: EGGS[i], left: Math.random() < 0.5, n: ++eggCount }
}

const query = ref('')
const filter = ref('all') // all | raw | soon
const activeId = ref(null) // id of the character whose popup is open
const panel = ref(null)

function statusOf(a) {
  if (a.glb || a.glb2 || (a.modes && a.modes.length)) return 'preview'
  if (a.src) return 'raw'
  return 'soon'
}

const all = characters.map(c => ({
  ...c,
  assets: c.assets.map(a => ({ ...a, status: statusOf(a) }))
}))

const counts = computed(() => {
  const n = { all: 0, preview: 0, raw: 0, soon: 0 }
  all.forEach(c => c.assets.forEach(a => { n.all++; n[a.status]++ }))
  return n
})

const chips = computed(() => [
  { key: 'all', label: 'all' },
  { key: 'raw', label: 'raw' },
  { key: 'soon', label: 'soon' }
].map(c => ({ ...c, n: counts.value[c.key] })))

const filtering = computed(() => query.value.trim() !== '' || filter.value !== 'all')

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all
    .map(c => {
      const charHit = q && `${c.name} ${c.aliases}`.toLowerCase().includes(q)
      const assets = c.assets.filter(a =>
        (filter.value === 'all' || a.status === filter.value) &&
        (!q || charHit || a.name.toLowerCase().includes(q))
      )
      return { ...c, assets }
    })
    // characters with no assets at all (e.g. Xingqiu) stay visible when nothing is filtered
    .filter(c => c.assets.length || (!filtering.value && c.assets.length === 0))
})

const shown = computed(() => visible.value.reduce((n, c) => n + c.assets.length, 0))

// small "raw 1 · soon 2" badges (3D is everywhere, so it gets no badge) for each card
function summaryOf(c) {
  const n = { preview: 0, raw: 0, soon: 0 }
  c.assets.forEach(a => { n[a.status]++ })
  return [
    { key: 'raw', label: 'raw', n: n.raw },
    { key: 'soon', label: 'soon', n: n.soon }
  ].filter(b => b.n)
}

// ---- popup ----
const active = computed(() =>
  activeId.value
    ? visible.value.find(c => c.id === activeId.value) || all.find(c => c.id === activeId.value)
    : null
)

function openChar(c) { activeId.value = c.id }
function closeChar() { activeId.value = null }
function clear() { query.value = ''; filter.value = 'all' }

function onKey(e) {
  if (e.key === 'Escape' && activeId.value) closeChar()
}

// lock page scroll while the popup is open, focus it so Esc / Tab behave
watch(activeId, async id => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = id ? 'hidden' : ''
  if (id) { await nextTick(); panel.value && panel.value.focus() }
})

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="ag">
    <div class="ag-bar">
      <div class="ag-search">
        <span class="ag-search-ico">⌕</span>
        <input
          v-model="query"
          type="search"
          placeholder="search a character or an asset…"
          aria-label="Search assets"
          @keydown.esc="query = ''"
        />
      </div>
      <div class="ag-chips">
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          class="ag-chip"
          :class="{ on: filter === c.key }"
          @click="filter = c.key"
        >{{ c.label }} <small>{{ c.n }}</small></button>
      </div>
      <div class="ag-tools">
        <span class="ag-count">{{ shown }} / {{ counts.all }} assets</span>
      </div>
    </div>

    <div class="ag-cards">
      <button
        v-for="c in visible"
        :id="'char-' + c.id"
        :key="c.id"
        type="button"
        class="ag-char"
        aria-haspopup="dialog"
        @click="openChar(c)"
        @mouseenter="pickEgg(c.id)"
        @focus="pickEgg(c.id)"
      >
        <img
          v-if="egg[c.id]"
          :key="egg[c.id].n"
          class="ag-egg"
          :class="{ left: egg[c.id].left }"
          :src="egg[c.id].src"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <span v-if="c.icon" class="ag-avatar">
          <img :src="c.icon" :alt="c.name" :style="{ transform: 'scale(' + (c.iconScale || 1) + ')' }" loading="lazy" />
        </span>
        <span v-else class="ag-avatar ag-initial">{{ c.name.charAt(0) }}</span>

        <span class="ag-name">{{ c.name }}</span>
        <span class="ag-num">{{ c.assets.length }} {{ c.assets.length === 1 ? 'asset' : 'assets' }}</span>
        <span class="ag-meta">
          <span v-for="b in summaryOf(c)" :key="b.key" class="ag-badge" :class="'is-' + b.key">{{ b.label }} {{ b.n }}</span>
        </span>
      </button>
    </div>

    <div v-if="!visible.length" class="ag-empty">
      <p>nothing found ( ´•̥̥̥ω•̥̥̥` )</p>
      <button type="button" class="ag-link" @click="clear">clear search</button>
    </div>

    <!-- popup: teleported to <body> so sticky bars / stacking contexts can't clip it -->
    <Teleport to="body">
      <Transition name="ag-fade">
        <div v-if="active" class="ag-overlay" @mousedown.self="closeChar">
          <div
            ref="panel"
            class="ag-panel"
            role="dialog"
            aria-modal="true"
            :aria-label="active.name + ' assets'"
            tabindex="-1"
          >
            <header class="ag-panel-head">
              <span v-if="active.icon" class="ag-avatar ag-avatar-sm">
                <img :src="active.icon" :alt="active.name" :style="{ transform: 'scale(' + (active.iconScale || 1) + ')' }" />
              </span>
              <span v-else class="ag-avatar ag-avatar-sm ag-initial">{{ active.name.charAt(0) }}</span>
              <span class="ag-panel-title">{{ active.name }}</span>
              <span class="ag-num">{{ active.assets.length }} {{ active.assets.length === 1 ? 'asset' : 'assets' }}</span>
              <button type="button" class="ag-close" aria-label="Close" @click="closeChar">×</button>
            </header>

            <div class="ag-grid">
              <template v-for="(a, i) in active.assets" :key="active.id + '-' + i">
                <div v-if="a.status === 'soon'" class="ag-soon" :style="{ '--i': i }">
                  <span class="ag-soon-name">{{ a.name }}</span>
                  <span class="ag-soon-tag">soon~</span>
                </div>
                <ModelViewer
                  v-else
                  :style="{ '--i': i }"
                  card
                  unlit
                  :name="a.name"
                  :src="a.src"
                  :thumb="a.thumb"
                  :glb="a.glb"
                  :glb2="a.glb2"
                  :label="a.label"
                  :label2="a.label2"
                  :modes="a.modes"
                  :raw="a.raw"
                  :brightness="a.brightness || 1.4"
                />
              </template>
              <div v-if="!active.assets.length" class="ag-soon">
                <span class="ag-soon-name">nothing yet</span>
                <span class="ag-soon-tag">soon~</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ag { margin-top: 8px; }

/* shared Heizou card gradient: main cards, popup header and popup asset cards */
.ag-char, .ag-grid, .ag-panel-head {
  --hz-card-bg: linear-gradient(155deg,
    color-mix(in srgb, #893d54 22%, var(--vp-c-bg-soft)) 0%,
    color-mix(in srgb, #893d54 6%, var(--vp-c-bg-soft)) 100%);
}

/* ---- toolbar ---- */
.ag-bar {
  position: sticky;
  top: var(--vp-nav-height, 64px);
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 12px 0;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}
.ag-search { position: relative; flex: 1 1 240px; }
.ag-search-ico {
  position: absolute; left: 12px; top: 50%; transform: translateY(-52%);
  color: var(--vp-c-text-3); font-size: 18px; pointer-events: none;
}
.ag-search input {
  width: 100%;
  height: 38px;
  padding: 0 14px 0 36px;
  font: inherit;
  font-size: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 19px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ag-search input:focus { border-color: var(--ag-accent); box-shadow: 0 0 0 3px var(--ag-accent-glow); }

.ag-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ag-chip {
  padding: 4px 12px;
  font-size: 12.5px;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ag-chip small { opacity: 0.65; margin-left: 2px; }
.ag-chip:hover { border-color: var(--ag-accent); }
.ag-chip.on { background: var(--ag-accent); border-color: var(--ag-accent); color: #fff; }

.ag-tools { display: flex; align-items: center; gap: 12px; margin-left: auto; font-size: 12.5px; }
.ag-count { color: var(--vp-c-text-3); }
.ag-link {
  padding: 0;
  font-size: 12.5px;
  color: var(--ag-accent-text);
  background: none;
  border: none;
  cursor: pointer;
}
.ag-link:hover { text-decoration: underline; }

/* ---- character cards (square) ---- */
.ag-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.ag-char {
  --hz-deep: #893d54;
  --hz-soft: #a66876;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  font: inherit;
  color: var(--vp-c-text-1);
  text-align: center;
  cursor: pointer;
  /* rose-tinted so a character card reads as a different layer from the asset cards in the popup */
  background: var(--hz-card-bg);
  border: 1px solid var(--hz-deep);
  border-radius: 20px;
  scroll-margin-top: 140px;
  position: relative;
  overflow: hidden; /* keeps the easter egg inside the rounded card */
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.ag-char:hover,
.ag-char:focus-visible {
  transform: translateY(-4px);
  border-color: var(--hz-soft);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35); /* plain shadow, no coloured glow */
  outline: none;
}

.ag-char > :not(.ag-egg) { position: relative; z-index: 1; }

/* easter egg: faint chibi that pops up in the bottom corner on hover */
.ag-egg {
  position: absolute;
  z-index: 0;
  right: -5%;
  bottom: -7%;
  width: 55%;
  height: auto;
  margin: 0;
  opacity: 0;
  pointer-events: none;
  user-select: none;
  transform: translateY(18%) rotate(8deg);
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.2);
}
.ag-egg.left { right: auto; left: -8%; --egg-rot: -8deg; }
.ag-egg { --egg-rot: 8deg; transform: translateY(18%) rotate(var(--egg-rot)); }
/* animation (not transition) so it also plays when a fresh egg is swapped in under the cursor */
.ag-char:hover .ag-egg,
.ag-char:focus-visible .ag-egg { opacity: 0.34; animation: ag-egg-in 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) both; }
@keyframes ag-egg-in {
  from { opacity: 0; transform: translateY(18%) rotate(var(--egg-rot)); }
  to   { opacity: 0.34; transform: translateY(0) rotate(calc(var(--egg-rot) * -0.5)); }
}
@media (hover: none) { .ag-egg { display: none; } }

/* twinkling sparkles (same ✦ the chibi pics have) */
.ag-char::before,
.ag-char::after {
  content: '✦';
  position: absolute;
  z-index: 0;
  color: var(--hz-soft);
  opacity: 0;
  pointer-events: none;
}
.ag-char::before { top: 12%; left: 13%; font-size: 16px; }
.ag-char::after { top: 20%; right: 14%; font-size: 11px; }
.ag-char:hover::before,
.ag-char:focus-visible::before { animation: ag-twinkle 1.8s ease-in-out infinite; }
.ag-char:hover::after,
.ag-char:focus-visible::after { animation: ag-twinkle 1.8s ease-in-out 0.6s infinite; }
@keyframes ag-twinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.6) rotate(0deg); }
  50% { opacity: 0.8; transform: scale(1.1) rotate(25deg); }
}

.ag-char:hover .ag-avatar,
.ag-char:focus-visible .ag-avatar {
  transform: scale(1.07) rotate(-4deg);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--hz-deep) 40%, transparent); /* flat ring, not a blur */
}
.ag-char:hover .ag-name,
.ag-char:focus-visible .ag-name { color: color-mix(in srgb, var(--hz-soft) 55%, var(--vp-c-text-1)); }

@media (prefers-reduced-motion: reduce) {
  .ag-char::before, .ag-char::after, .ag-egg { animation: none !important; }
  .ag-char:hover .ag-egg, .ag-char:focus-visible .ag-egg { transform: none; }
}

.ag-avatar {
  flex: none;
  width: 84px;
  height: 84px;
  margin-bottom: 6px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 2px solid #a66876;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.3), box-shadow 0.25s ease;
}
.ag-avatar-sm { width: 44px; height: 44px; margin: 0; }
.ag-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: cover;
}
.ag-initial {
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 26px; color: #a66876;
}

.ag-name {
  transition: color 0.2s ease;
  max-width: 100%;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ag-num { font-size: 12.5px; color: var(--vp-c-text-2); }
.ag-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; min-height: 18px; }
.ag-badge {
  padding: 0 8px;
  font-size: 11px;
  line-height: 18px;
  color: var(--vp-c-text-2);
  background: color-mix(in srgb, #893d54 30%, transparent);
  border-radius: 9px;
}
.ag-badge.is-soon { background: transparent; border: 1px dashed var(--vp-c-divider); }

/* ---- popup ---- */
.ag-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 8, 12, 0.72);
}
.ag-panel {
  width: min(640px, 100%);
  max-height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid #893d54;
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  outline: none;
}
.ag-panel-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--hz-card-bg);
  border-bottom: 1px solid #893d54;
}
.ag-panel-title { font-size: 1.15rem; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ag-close {
  margin-left: auto;
  flex: none;
  width: 34px;
  height: 34px;
  font-size: 24px;
  line-height: 1;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ag-close:hover { color: #fff; background: #893d54; border-color: #893d54; }

.ag-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); /* max 3 per row */
  gap: 14px;
  padding: 18px;
  overflow-y: auto;
}

/* asset cards inside the popup (ModelViewer root).
   NOTE: no transform on these - the viewer has its own fixed-position popup that a transform would trap,
   so the lift uses `top` instead. */
.ag-grid > :deep(:not(.ag-soon)) {
  position: relative;
  top: 0;
  background: var(--hz-card-bg);
  border-color: #893d54;
  box-shadow: none;
  transition: top 0.2s ease, border-color 0.2s ease;
}
.ag-grid > :deep(:not(.ag-soon):hover) {
  top: -3px;
  border-color: #a66876;
  box-shadow: none;
}

/* staggered entrance: plays once when the popup opens (backwards fill so hover still works afterwards) */
.ag-grid > * { animation: ag-rise 0.38s ease backwards; animation-delay: calc(var(--i, 0) * 45ms); }
@keyframes ag-rise {
  from { opacity: 0; top: 12px; }
  to   { opacity: 1; top: 0; }
}
.ag-grid > .ag-soon { position: relative; }
@media (prefers-reduced-motion: reduce) { .ag-grid > * { animation: none; } }

/* opacity only: a transform here would trap the viewer's own fixed-position popup */
.ag-fade-enter-active, .ag-fade-leave-active { transition: opacity 0.18s ease; }
.ag-fade-enter-from, .ag-fade-leave-to { opacity: 0; }

/* ---- "soon" placeholder card ---- */
.ag-soon {
  min-height: 124px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  background: transparent;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 16px;
  opacity: 0.6;
}
.ag-soon-name { font-weight: 600; font-size: 0.95rem; line-height: 1.3; word-break: break-word; }
.ag-soon-tag { font-size: 11px; color: var(--vp-c-text-3); }

/* ---- empty state ---- */
.ag-empty { padding: 60px 0; text-align: center; color: var(--vp-c-text-2); }

@media (max-width: 640px) {
  .ag-tools { margin-left: 0; width: 100%; justify-content: space-between; }
  .ag-cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .ag-avatar { width: 68px; height: 68px; }
  .ag-overlay { padding: 10px; }
  .ag-panel { max-height: 92vh; border-radius: 18px; }
  .ag-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
}
</style>
