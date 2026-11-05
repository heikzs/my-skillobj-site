import { defineConfig } from 'vitepress'

const SITE = 'https://genshin-skillobj.pages.dev'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",

  sitemap: {
    hostname: `${SITE}/`
  },

  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],

    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: `${SITE}/` }],
    ['meta', { property: 'og:title', content: 'Genshin SkillObj' }],
    ['meta', { property: 'og:description', content: 'For all raw + fixed skillobj files\nmade by an inexperienced blender user (ㅅ´ ˘ `)' }],
    ['meta', { property: 'og:image', content: `${SITE}/banner.png` }],

    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Genshin SkillObj' }],
    ['meta', { name: 'twitter:description', content: 'For all raw + fixed skillobj files' }],
    ['meta', { name: 'twitter:image', content: `${SITE}/banner.png` }],

    ['meta', { name: 'theme-color', content: '#893d54' }]
  ],

  themeConfig: {
    logo: '/logo.png',
    search: { provider: 'local' },
    nav: [ { text: 'Request', link: '/req' } ]
  }
})