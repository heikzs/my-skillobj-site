import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import AudioPlayer from './AudioPlayer.vue'
import ModelViewer from './ModelViewer.vue'
import AssetsGallery from './AssetsGallery.vue'
import './custom.css'
import './heizou-bg.css'

const myPlaylist = [
  { src: '/Storm Chaser.mp3', title: 'Storm Chaser' },
  { src: '/Flow of Autumn Wind.mp3', title: 'Flow of Autumn Wind' }
]

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(AudioPlayer, { playlist: myPlaylist }),
      'sidebar-nav-before': () => h(AudioPlayer, { playlist: myPlaylist })
    })
  },
  enhanceApp({ app }) {
    app.component('ModelViewer', ModelViewer)
    app.component('AssetsGallery', AssetsGallery)
  }
}
