import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import AudioPlayer from './AudioPlayer.vue'
import './custom.css' 

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(AudioPlayer, { 
        // Pass your list of songs here! Make sure names match your public folder files
        playlist: [
          { src: '/Storm Chaser.mp3', title: 'Storm Chaser' },
          { src: '/Flow of Autumn Wind.mp3', title: 'Flow of Autumn Wind' }
        ]
      })
    })
  }
}
