import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",
  
  sitemap: {
    hostname: 'https://genshin-skillobj.pages.dev/'
  },
  
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    
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
