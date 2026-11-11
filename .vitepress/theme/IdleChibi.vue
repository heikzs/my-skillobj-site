<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { withBase } from 'vitepress'

// ---- settings ----
const IDLE_MS = 30 * 60 * 1000 // 30 minutes. Set to e.g. 5000 while testing.
const CHIBIS = [2, 5].map(n => withBase(`/easter/heizou-${n}.png`)) // same files as the card easter eggs

const show = ref(false)
const chibi = ref(CHIBIS[0])

let lastActive = Date.now()
let timer = null

function schedule(ms) {
  clearTimeout(timer)
  timer = setTimeout(check, ms)
}

// timers get throttled in background tabs, so compare timestamps instead of trusting the timer
function check() {
  const idleFor = Date.now() - lastActive
  if (idleFor >= IDLE_MS) {
    chibi.value = CHIBIS[Math.floor(Math.random() * CHIBIS.length)]
    show.value = true
  } else {
    schedule(IDLE_MS - idleFor)
  }
}

let lastBump = 0
function bump() {
  if (show.value) return // once she's out, only an explicit click / key dismisses her (mouse jitter won't)
  const now = Date.now()
  if (now - lastBump < 1000) return // cheap throttle, mousemove fires constantly
  lastBump = now
  lastActive = now
}

function dismiss() {
  show.value = false
  lastActive = Date.now()
  schedule(IDLE_MS)
}

function onKey(e) {
  if (show.value) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss() }
    return
  }
  bump()
}

const EVENTS = ['mousemove', 'pointerdown', 'wheel', 'scroll', 'touchstart']

onMounted(() => {
  EVENTS.forEach(ev => window.addEventListener(ev, bump, { passive: true }))
  window.addEventListener('keydown', onKey)
  schedule(IDLE_MS)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  EVENTS.forEach(ev => window.removeEventListener(ev, bump))
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ic">
      <div v-if="show" class="ic-overlay" role="dialog" aria-modal="true" aria-label="Are you still there?" @click.self="dismiss">
        <div class="ic-wrap">
          <div class="ic-bubble">
            <span class="ic-spark s1">✦</span>
            <span class="ic-spark s2">✦</span>
            <p>hey, are u still there?</p>
            <button type="button" class="ic-btn" @click="dismiss">yeah, i'm here</button>
          </div>
          <img class="ic-chibi" :src="chibi" alt="" draggable="false" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ic-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 8, 12, 0.62);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.ic-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.ic-bubble {
  position: relative;
  padding: 16px 22px 18px;
  text-align: center;
  color: var(--vp-c-text-1);
  background: linear-gradient(155deg,
    color-mix(in srgb, #893d54 22%, var(--vp-c-bg-soft)) 0%,
    color-mix(in srgb, #893d54 6%, var(--vp-c-bg-soft)) 100%);
  border: 1px solid #893d54;
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}
/* little tail pointing at the chibi */
.ic-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -7px;
  width: 12px;
  height: 12px;
  background: color-mix(in srgb, #893d54 8%, var(--vp-c-bg-soft));
  border-right: 1px solid #893d54;
  border-bottom: 1px solid #893d54;
  transform: translateX(-50%) rotate(45deg);
}
.ic-bubble p { margin: 0 0 12px; font-size: 1.05rem; font-weight: 600; }

.ic-btn {
  padding: 5px 16px;
  font: inherit;
  font-size: 13px;
  color: #fff;
  background: #893d54;
  border: 1px solid #893d54;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.ic-btn:hover, .ic-btn:focus-visible { background: #a66876; border-color: #a66876; outline: none; }

.ic-chibi {
  display: block;
  width: min(220px, 55vw);
  height: auto;
  margin: 10px 0 0;
  user-select: none;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));
  animation: ic-bob 2.6s ease-in-out 0.8s infinite;
}
@keyframes ic-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(-2deg); }
}

.ic-spark { position: absolute; color: #a66876; animation: ic-twinkle 1.8s ease-in-out infinite; }
.ic-spark.s1 { top: -9px; left: 14px; font-size: 16px; }
.ic-spark.s2 { top: 6px; right: 12px; font-size: 11px; animation-delay: 0.6s; }
@keyframes ic-twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.7) rotate(0deg); }
  50% { opacity: 0.9; transform: scale(1.1) rotate(25deg); }
}

/* enter / leave: backdrop fades, bubble + chibi pop up from below */
.ic-enter-active, .ic-leave-active { transition: opacity 0.4s ease; }
.ic-enter-from, .ic-leave-to { opacity: 0; }
.ic-enter-active .ic-wrap { transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.3, 1.25); }
.ic-leave-active .ic-wrap { transition: transform 0.3s ease; }
.ic-enter-from .ic-wrap { transform: translateY(60px) scale(0.9); }
.ic-leave-to .ic-wrap { transform: translateY(30px) scale(0.95); }

@media (prefers-reduced-motion: reduce) {
  .ic-enter-active, .ic-leave-active, .ic-enter-active .ic-wrap, .ic-leave-active .ic-wrap { transition: none; }
  .ic-chibi, .ic-spark { animation: none; }
}
</style>
