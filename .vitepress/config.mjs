import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: "Genshin SkillObj",
  description: "For all raw + fixed skillobj files",
  themeConfig: {
    logo: '/logo.png',

    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Home', link: '/' }
    ]
  }
})
