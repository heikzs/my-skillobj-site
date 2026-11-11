<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import ModelViewer from './ModelViewer.vue'
import { withBase } from 'vitepress'
import { characters } from './assets-data.js'

// ---- hover easter eggs: a random chibi peeks out of the card corner ----
// put the files in  docs/public/easter/  (served from /easter/)
const EGGS = [1, 3, 4].map(n => withBase(`/easter/heizou-${n}.png`))
const egg = ref({}) // character id -> { src, left, n }
let eggCount = 0

// rare guest: 1 in 4 hovers shows a Kazuha chibi instead of a Heizou one (files are .webp)
const KAZUHA = [1, 2, 3].map(n => withBase(`/easter/kazuha-${n}.webp`))
const KAZUHA_CHANCE = 0.1

function pickEgg(id) {
  const prev = egg.value[id]
  const pool = Math.random() < KAZUHA_CHANCE ? KAZUHA : EGGS
  let src
  // don't show the same picture twice in a row on the same card
  do { src = pool[Math.floor(Math.random() * pool.length)] } while (pool.length > 1 && prev && prev.src === src)
  // new key each hover so the pop-in animation replays
  egg.value[id] = { src, left: Math.random() < 0.5, n: ++eggCount }
}

const query = ref('')
const filter = ref('all') // all | raw | soon
const activeId = ref(null) // id of the character whose card is expanded

function statusOf(a) {
  if (a.glb || a.glb2 || (a.modes && a.modes.length)) return 'preview'
  if (a.src) return 'raw'
  return 'soon'
}

// No guessing from names: an asset is a weapon only when you mark it in assets-data.js with  "weapon": true
// (any non-empty value works). Only that asset card gets the tag, not the character card.
const isWeapon = a => !!a.weapon

const all = characters.map(c => ({
  ...c,
  assets: c.assets.map(a => ({ ...a, status: statusOf(a), isWeapon: isWeapon(a) }))
}))

const counts = computed(() => {
  const n = { all: 0, preview: 0, raw: 0, soon: 0, weapon: 0 }
  all.forEach(c => c.assets.forEach(a => { n.all++; n[a.status]++; if (a.isWeapon) n.weapon++ }))
  return n
})

// the weapon chip is always shown (it just reads 0 until you mark an asset with "weapon": true)
const chips = computed(() => [
  { key: 'all', label: 'all' },
  { key: 'raw', label: 'raw' },
  { key: 'soon', label: 'soon' },
].map(c => ({ ...c, n: counts.value[c.key] })))

function matchesFilter(a) {
  if (filter.value === 'all') return true
  if (filter.value === 'weapon') return a.isWeapon
  return a.status === filter.value
}

const filtering = computed(() => query.value.trim() !== '' || filter.value !== 'all')

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return all
    .map(c => {
      const charHit = q && `${c.name} ${c.aliases}`.toLowerCase().includes(q)
      const assets = c.assets.filter(a =>
        matchesFilter(a) &&
        (!q || charHit || a.name.toLowerCase().includes(q) || (a.isWeapon && 'weapon'.includes(q)))
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

// ---- expand in place (no popup): the card takes the full row and grows open ----
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// no auto-scroll: the page stays exactly where it is while the card grows
function toggleChar(c) {
  activeId.value = activeId.value === c.id ? null : c.id
}

function clear() { query.value = ''; filter.value = 'all' }

// height + opacity only (never transform): the viewer has its own fixed-position popup that a transform would trap
function onEnter(el, done) {
  if (reduced()) return done()
  const h = el.scrollHeight
  el.style.overflow = 'hidden'
  const a = el.animate(
    [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
    { duration: 440, easing: EASE }
  )
  a.onfinish = () => { el.style.overflow = ''; done() }
}

function onLeave(el, done) {
  if (reduced()) return done()
  const h = el.offsetHeight
  el.style.overflow = 'hidden'
  const a = el.animate(
    [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
    { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
  )
  a.onfinish = done
}

function onKey(e) {
  if (e.key === 'Escape' && activeId.value) activeId.value = null
}

// marks the page so the global rules below can hide VitePress's "On this page" outline here only
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.body.classList.add('ag-page')
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.classList.remove('ag-page')
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
      <div
        v-for="(c, idx) in visible"
        :id="'char-' + c.id"
        :key="c.id"
        :style="{ '--i': idx }"
        class="ag-char"
        :class="{ open: activeId === c.id }"
        @mouseenter="pickEgg(c.id)"
        @focusin="pickEgg(c.id)"
      >
        <img
          v-if="egg[c.id] && activeId !== c.id"
          :key="egg[c.id].n"
          class="ag-egg"
          :class="{ left: egg[c.id].left }"
          :src="egg[c.id].src"
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <button
          type="button"
          class="ag-head"
          :aria-expanded="activeId === c.id"
          @click="toggleChar(c)"
        >
          <span v-if="c.icon" class="ag-avatar">
            <img :src="c.icon" :alt="c.name" :style="{ transform: 'scale(' + (c.iconScale || 1) + ')' }" loading="lazy" />
          </span>
          <span v-else class="ag-avatar ag-initial">{{ c.name.charAt(0) }}</span>

          <span class="ag-name">{{ c.name }}</span>
          <span class="ag-num">{{ c.assets.length }} {{ c.assets.length === 1 ? 'asset' : 'assets' }}</span>
          <span class="ag-meta">
            <span v-for="b in summaryOf(c)" :key="b.key" class="ag-badge" :class="'is-' + b.key">{{ b.label }} {{ b.n }}</span>
          </span>
          <span class="ag-x" aria-hidden="true">×</span>
        </button>

        <Transition :css="false" @enter="onEnter" @leave="onLeave">
          <div v-if="activeId === c.id" class="ag-body">
            <div class="ag-grid">
              <template v-for="(a, i) in c.assets" :key="c.id + '-' + i">
                <div v-if="a.status === 'soon'" class="ag-soon" :style="{ '--i': i }">
                  <span class="ag-soon-name">{{ a.name }}</span>
                  <span class="ag-soon-tag">soon~<template v-if="a.isWeapon"> · weapon</template></span>
                </div>
                <ModelViewer
                  v-else
                  :style="{ '--i': i }"
                  card
                  unlit
                  :tag="a.isWeapon ? 'weapon' : ''"
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
              <div v-if="!c.assets.length" class="ag-soon" :style="{ '--i': 0 }">
                <span class="ag-soon-name">nothing yet</span>
                <span class="ag-soon-tag">soon~</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div v-if="!visible.length" class="ag-empty">
      <p>nothing found ( ´•̥̥̥ω•̥̥̥` )</p>
      <button type="button" class="ag-link" @click="clear">clear search</button>
    </div>
  </div>
</template>

<style scoped>
.ag { margin-top: 8px; }

/* shared Heizou card gradient: character cards and asset cards */
.ag-char, .ag-grid {
  --hz-card-bg: linear-gradient(155deg,
    color-mix(in srgb, #893d54 22%, var(--vp-c-bg-soft)) 0%,
    color-mix(in srgb, #893d54 6%, var(--vp-c-bg-soft)) 100%);
}

/* ---- toolbar ---- */
/* sticky again, but frosted glass instead of the old solid strip with a border:
   translucent + blurred + rounded, no outline, so it floats instead of looking cut out */
.ag-bar {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + var(--vp-layout-top-height, 0px) + var(--vp-local-nav-height, 0px) + 8px);
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin: 0 -10px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--vp-c-bg) 72%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 18px;
  animation: ag-fade-up 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
}
@keyframes ag-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
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
  border: 1px solid transparent;
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
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
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

/* ---- character cards ---- */
.ag-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-flow: row dense; /* cards fill the gaps left by an expanded card */
  align-items: start;
  gap: 14px;
  margin-top: 18px;
}

.ag-char {
  --hz-deep: #893d54;
  --hz-soft: #a66876;
  min-width: 0;
  color: var(--vp-c-text-1);
  background: var(--hz-card-bg);
  border: 1px solid var(--hz-deep);
  border-radius: 18px;
  scroll-margin-top: 84px;
  position: relative;
  overflow: hidden; /* keeps the easter egg inside the rounded card */
  animation: ag-fade-up 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: calc(var(--i, 0) * 45ms + 80ms);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.ag-char:not(.open):hover,
.ag-char:not(.open):focus-within {
  transform: translateY(-4px);
  border-color: var(--hz-soft);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

/* expanded: takes the whole row. NO transform here, a transform would trap the viewer's fixed-position popup */
.ag-char.open {
  grid-column: 1 / -1;
  border-color: var(--hz-soft);
}

/* the clickable header (the whole closed card is this button) */
.ag-head {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px 12px 14px;
  font: inherit;
  color: inherit;
  text-align: center;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
}
.ag-head:focus-visible { box-shadow: inset 0 0 0 2px var(--hz-soft); border-radius: 18px; }

.ag-char.open .ag-head {
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
  padding: 14px 18px;
  text-align: left;
}

.ag-x {
  display: none;
  margin-left: auto;
  width: 30px;
  height: 30px;
  font-size: 22px;
  line-height: 28px;
  text-align: center;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  transition: all 0.15s ease;
}
.ag-char.open .ag-x { display: block; }
.ag-char.open .ag-head:hover .ag-x { color: #fff; background: var(--hz-deep); border-color: var(--hz-deep); }

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
.ag-char:focus-within .ag-egg { opacity: 0.34; animation: ag-egg-in 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) both; }
@keyframes ag-egg-in {
  from { opacity: 0; transform: translateY(18%) rotate(var(--egg-rot)); }
  to   { opacity: 0.34; transform: translateY(0) rotate(calc(var(--egg-rot) * -0.5)); }
}
@media (hover: none) { .ag-egg { display: none; } }

/* twinkling sparkles (same ✦ the chibi pics have), closed cards only */
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
.ag-char:not(.open):hover::before,
.ag-char:not(.open):focus-within::before { animation: ag-twinkle 1.8s ease-in-out infinite; }
.ag-char:not(.open):hover::after,
.ag-char:not(.open):focus-within::after { animation: ag-twinkle 1.8s ease-in-out 0.6s infinite; }
@keyframes ag-twinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.6) rotate(0deg); }
  50% { opacity: 0.8; transform: scale(1.1) rotate(25deg); }
}

.ag-char:not(.open):hover .ag-avatar,
.ag-char:not(.open):focus-within .ag-avatar {
  transform: scale(1.07) rotate(-4deg);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--hz-deep) 40%, transparent);
}
.ag-char:not(.open):hover .ag-name,
.ag-char:not(.open):focus-within .ag-name { color: color-mix(in srgb, var(--hz-soft) 55%, var(--vp-c-text-1)); }

@media (prefers-reduced-motion: reduce) {
  .ag-bar, .ag-char, .ag-char::before, .ag-char::after, .ag-empty, .ag-egg { animation: none !important; }
  .ag-char:hover .ag-egg, .ag-char:focus-within .ag-egg { transform: none; }
}

.ag-avatar {
  flex: none;
  width: 68px;
  height: 68px;
  margin-bottom: 6px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 2px solid #a66876;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.3), box-shadow 0.25s ease, width 0.3s ease, height 0.3s ease;
}
.ag-char.open .ag-avatar { width: 44px; height: 44px; margin: 0; }
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
  display: block;
  flex: none;
  max-width: 100%;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ag-char.open .ag-name { font-size: 1.15rem; min-width: 0; flex: 0 1 auto; }
.ag-num { font-size: 12.5px; color: var(--vp-c-text-2); }
.ag-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; min-height: 18px; }
.ag-char.open .ag-meta { min-height: 0; }
.ag-badge {
  padding: 0 8px;
  font-size: 11px;
  line-height: 18px;
  color: var(--vp-c-text-2);
  background: color-mix(in srgb, #893d54 30%, transparent);
  border-radius: 9px;
}
.ag-badge.is-soon { background: transparent; border: 1px dashed var(--vp-c-divider); }

/* ---- expanded body ---- */
.ag-body {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--hz-deep);
}
.ag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 14px;
  padding: 18px;
}

/* asset cards (ModelViewer root). The viewer's modal is teleported to <body>, so transforms here are safe,
   and they run on the GPU (the old `top` animation re-laid-out the page on every frame = the lag). */
.ag-grid > :deep(:not(.ag-soon)) {
  background: var(--hz-card-bg);
  border-color: #893d54;
  box-shadow: none;
}
.ag-grid > :deep(:not(.ag-soon):hover) {
  border-color: #a66876;
  box-shadow: none;
}

/* staggered entrance, starts once the card has grown (backwards fill so hover still works afterwards) */
.ag-grid > * { animation: ag-rise 0.42s cubic-bezier(0.2, 0.7, 0.2, 1) backwards; animation-delay: calc(min(var(--i, 0), 8) * 35ms + 120ms); }
@keyframes ag-rise {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) { .ag-grid > * { animation: none; } }

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
.ag-empty { padding: 60px 0; text-align: center; color: var(--vp-c-text-2); animation: ag-fade-up 0.5s ease backwards; }

@media (max-width: 640px) {
  .ag-bar { margin: 0; padding: 8px 6px; }
  .ag-tools { margin-left: 0; width: 100%; justify-content: space-between; }
  .ag-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .ag-head { padding: 14px 8px 12px; }
  .ag-char.open .ag-head { padding: 12px 14px; }
  .ag-avatar { width: 60px; height: 60px; }
  .ag-char.open .ag-avatar { width: 40px; height: 40px; }
  .ag-name { font-size: 0.9rem; }
  .ag-char.open .ag-name { font-size: 1.05rem; }
  .ag-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px; }
}
</style>

<!-- global (unscoped): hide VitePress "On this page" on this page only, via the body class set above -->
<style>
.ag-page .VPLocalNavOutlineDropdown,
.ag-page .VPDocAsideOutline { display: none !important; }
</style>
