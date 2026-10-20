import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",
  
  // Fixed the missing bracket and comma at the end of this section:
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }]
  ], 

  themeConfig: {
    logo: '/logo.png',

    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Request', link: '/req' } 
    ]
  }
})
