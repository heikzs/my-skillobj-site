# SkillObj Request

::: info <span style="color: #eea5a5;">(♡´ᵕ`)</span>
I am doing all of this completely by myself! Since there are **100+ characters** in total, progress takes time, so pls be patient with me

Want to see which characters are actively being worked on?

* Check out the [SkillObj Tracker Spreadsheet](https://docs.google.com/spreadsheets/d/1U9pjaHSF1u60ME3MmcQRSyr1bzTszYJdHvHUZTZiAAM/edit?usp=sharing)!
:::

<iframe src="https://tally.so/embed/RWKXjd" loading="lazy" width="100%" height="500" frameborder="0" marginheight="0" marginwidth="0" title="SkillObj Request Form"></iframe>

<img 
  src="/pic 5.png" 
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

/* page-load animation: every block of the page fades up one after another.
   (skips the mascot and anything wrapping it: a transform on a parent would break its position: fixed) */
@keyframes doc-rise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes doc-pop {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}
.VPDoc .vp-doc > div > *:not(.floating-mascot):not(:has(.floating-mascot)) {
  animation: doc-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
}
.VPDoc .vp-doc > div > :nth-child(2)  { animation-delay: 0.06s; }
.VPDoc .vp-doc > div > :nth-child(3)  { animation-delay: 0.12s; }
.VPDoc .vp-doc > div > :nth-child(4)  { animation-delay: 0.18s; }
.VPDoc .vp-doc > div > :nth-child(5)  { animation-delay: 0.24s; }
.VPDoc .vp-doc > div > :nth-child(6)  { animation-delay: 0.3s; }
.VPDoc .vp-doc > div > :nth-child(7)  { animation-delay: 0.36s; }
.VPDoc .vp-doc > div > :nth-child(8)  { animation-delay: 0.42s; }
.VPDoc .vp-doc > div > :nth-child(n+9) { animation-delay: 0.48s; }
.floating-mascot { animation: doc-pop 0.6s cubic-bezier(0.2, 0.8, 0.3, 1.3) 0.6s backwards; }

/* frosted-glass boxes (the ::: info box and > quotes), same look as the gallery search bar */
.vp-doc .custom-block,
.vp-doc blockquote {
  background: color-mix(in srgb, var(--vp-c-bg) 72%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: 18px;
}
.vp-doc blockquote { padding: 14px 20px; }

@media (prefers-reduced-motion: reduce) {
  .VPDoc .vp-doc > div > *, .floating-mascot { animation: none !important; }
}
</style>