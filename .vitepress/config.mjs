import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",
  
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    
    // --- Link Preview / Image Embed Tags ---
    // The image that will display in the embed (Must be a full absolute URL)
    ['meta', { property: 'og:image', content: 'banner.png' }],
    
    // Platform compatibility tags
    ['meta', { property: 'og:title', content: 'Genshin SkillObj' }],
    ['meta', { property: 'og:description', content: 'For all raw + fixed skillobj files' }],
    ['meta', { property: 'og:type', content: 'website' }],
    
    // Optional: Accent color strip for Discord/Slack embeds
    ['meta', { name: 'theme-color', content: '#893d54' }]
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
