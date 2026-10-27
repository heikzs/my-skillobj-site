<template>
  <div class="custom-audio-player">
    <div class="player-top">
      <!-- Play/Pause Button -->
      <button class="play-btn" @click="togglePlay" :aria-label="isPlaying ? 'Pause' : 'Play'">
        <svg v-if="!isPlaying" viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <!-- Next Track/Skip Button -->
      <button class="skip-btn" @click="nextTrack" aria-label="Next Track">
        <svg viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
      
      <!-- Current Song Title with Hover Marquee Effect -->
      <div class="song-info">
        <div class="song-title-wrap">
          <span class="song-title">{{ currentTrack.title }}</span>
        </div>
      </div>
    </div>

    <!-- Volume Controls (Slides out horizontally on hover) -->
    <div class="player-bottom">
      <svg viewBox="0 0 24 24" class="volume-icon"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
      <input 
        type="range" 
        min="0" 
        max="1" 
        step="0.01" 
        v-model="volume" 
        @input="updateVolume" 
        class="volume-slider"
      />
      <span class="volume-percentage">{{ Math.round(volume * 100) }}%</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  playlist: { type: Array, required: true, default: () => [] }
})

const currentIndex = ref(0)
const isPlaying = ref(false)
const volume = ref(0.5)
let audio = null

const currentTrack = computed(() => {
  return props.playlist[currentIndex.value] || { src: '', title: 'No Track' }
})

const initAudio = () => {
  if (audio) {
    audio.pause()
    audio.removeEventListener('ended', handleTrackEnded)
  }

  audio = new Audio(currentTrack.value.src)
  audio.volume = volume.value
  audio.addEventListener('ended', handleTrackEnded)

  if (isPlaying.value) {
    audio.play().catch(err => console.log("Playback interrupted:", err))
  }
}

const handleTrackEnded = () => {
  currentIndex.value = (currentIndex.value + 1) % props.playlist.length
  initAudio()
  audio.play().catch(err => console.log("Playback auto-start interrupted:", err))
}

onMounted(() => {
  if (props.playlist.length > 0) {
    initAudio()
  }
})

onBeforeUnmount(() => {
  if (audio) {
    audio.pause()
    audio.removeEventListener('ended', handleTrackEnded)
  }
})

watch(currentIndex, () => {
  initAudio()
})

const togglePlay = () => {
  if (!audio) return
  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
  } else {
    audio.play()
      .then(() => { isPlaying.value = true })
      .catch(err => console.log("Playback blocked:", err))
  }
}

const nextTrack = () => {
  currentIndex.value = (currentIndex.value + 1) % props.playlist.length
}

const updateVolume = () => {
  if (audio) audio.volume = volume.value
}
</script>

<style scoped>
/* Main Snug Container anchored cleanly from the right side */
.custom-audio-player {
  background-color: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  padding: 4px 10px 4px 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--vp-font-family-base);
  height: 32px;
  box-sizing: border-box;
  position: absolute;
  right: 140px; 
  top: 16px;
  z-index: 100;
}

.player-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.play-btn {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s, background-color 0.2s;
}

.play-btn:hover {
  transform: scale(1.05);
  background-color: var(--vp-c-brand-2);
}

.play-btn .icon {
  width: 12px;
  height: 12px;
}

.skip-btn {
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 18px;
  height: 18px;
  transition: color 0.2s;
}

.skip-btn:hover {
  color: var(--vp-c-brand-1);
}

.skip-btn .icon {
  width: 14px;
  height: 14px;
}

/* Song info wrapper with text marquee clip boundaries */
.song-info {
  display: flex;
  align-items: center;
  width: 95px;
  overflow: hidden;
  position: relative;
}

.song-title-wrap {
  display: inline-block;
  white-space: nowrap;
  width: 100%;
}

.song-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  display: inline-block;
  transition: transform 2s linear;
}

/* Slide track text dynamically when hovering the text block zone */
.song-info:hover .song-title {
  transform: translateX(-40%);
}

/* Volume Layout and Transition Settings */
.player-bottom {
  display: flex;
  align-items: center;
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 8px;
  height: 16px;
}

.volume-icon {
  width: 14px;
  height: 14px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  flex-shrink: 0;
}

.volume-slider {
  width: 0px;
  opacity: 0;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
  height: 3px;
  margin: 0;
  padding: 0;
  transition: width 0.2s ease, opacity 0.15s ease, margin-left 0.2s ease;
}

.volume-percentage {
  display: none;
}

/* Expand slider right next to the speaker icon smoothly on hover */
.player-bottom:hover .volume-slider {
  width: 60px;
  opacity: 1;
  margin-left: 6px;
}

@media (max-width: 680px) {
  .player-bottom {
    display: none;
  }
}
</style>
