import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",
  
  // Add this so VitePress automatically fixes your local path for Discord embeds when building the site!
  sitemap: {
    hostname: 'https://genshin-skillobj.pages.dev/' // <-- Put your actual website link here
  },
  
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    
    // --- Added leading slash for local public folder path ---
    ['meta', { property: 'og:image', content: '/banner.png' }],
    
    ['meta', { property: 'og:title', content: 'Genshin SkillObj' }],
    ['meta', { property: 'og:description', content: 'For all raw + fixed skillobj files' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'theme-color', content: '#893d54' }]
  ], 

  themeConfig: {
    logo: '/logo.png',
    search: { provider: 'local' },
    nav: [ { text: 'Request', link: '/req' } ]
  }
})
