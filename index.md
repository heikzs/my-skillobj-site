---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Genshin SkillObj"
  text: 
  tagline: "For all raw + fixed genshin SkillObj files"
  image:
    src: ./pic 3.png
    alt: Genshin Banner
  actions:
    - theme: brand
      text: Let's Go !
      link: /Assets
    - theme: alt
      text: Info
      link: /Info

features:
  - title: Heya~ !
    details: Made by an inexperienced blender user, really slow progress @_@
---

<img 
  src="/pic 1.png" 
  alt="Mascot" 
  class="floating-mascot"
  style="position: fixed; right: 30px; bottom: 30px; width: 120px; z-index: 100; pointer-events: auto; cursor: pointer;" 
/>

<style>
.floating-mascot {
  transition: transform 0.25s ease-in-out; 
}

.floating-mascot:hover {
  transform: scale(1.3); 
}

/* page-load animation: everything fades up one after another */
@keyframes home-rise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes home-pop {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}
.VPHero .name,
.VPHero .text,
.VPHero .tagline,
.VPHero .actions,
.VPHero .image,
.VPHome .VPFeatures {
  animation: home-rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
}
.VPHero .name     { animation-delay: 0.05s; }
.VPHero .text     { animation-delay: 0.12s; }
.VPHero .tagline  { animation-delay: 0.2s; }
.VPHero .actions  { animation-delay: 0.3s; }
.VPHero .image    { animation-delay: 0.15s; }
.VPHome .VPFeatures { animation-delay: 0.45s; }
.floating-mascot  { animation: home-pop 0.6s cubic-bezier(0.2, 0.8, 0.3, 1.3) 0.8s backwards; }

@media (prefers-reduced-motion: reduce) {
  .VPHero .name, .VPHero .text, .VPHero .tagline, .VPHero .actions, .VPHero .image,
  .VPHome .VPFeatures, .floating-mascot { animation: none; }
}

/* frosted-glass "Heya~ !" card, same look as the gallery search bar.
   Lower the 72% to see more of the background through it, raise the blur for a stronger frost. */
.VPHome .VPFeature {
  background: color-mix(in srgb, var(--vp-c-bg) 72%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 18px;
}
</style>
