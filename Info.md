# ⊹ 𖦹 Info

---
All assets ripped using [AnimeStudio](https://github.com/Escartem/AnimeStudio) with [Festivity Shader](https://github.com/festivities/Blender-miHoYo-Shaders) applied ! 

*Except for like 20% of it which is from [Zeroruka](https://github.com/zeroruka/GI-Assets/tree/main/SkillObj/Characters)... but the other 80% is all MEEE! <span style="color: #eea5a5;">(˶˃𐃷 ˂˶)</span>*

> Alsoo a little disclaimer: I mostly just mess around with nodes and stuff until i get things working sooo i honestly don't know if *this or that* is actually how things are supposed to work lmao. I'm still pretty inexperienced, and i sometimes use AI to help me figure out the harder parts since i don't always have the time to troubleshoot everything myself. I still try my best to understand things and make the assets easier for everyone to use though!! Hope u don't mind <span style="color: #eea5a5;">(,,>﹏<,,)</span>*

## Compatibility
Assets can be use in both **Normal Blender (3.0+)** and **Goo Blender (4.0+)**! <span style="color: #eea5a5;">yayy (˶ˆᗜˆ˵)</span>

## Inside the ZIP !
* Ready to use `.blend` file
* Raw files: Just the original `.fbx` mesh and their textures

## Match the SkillObj lighting !
1. Select the object, then **Shift + select** the character.
2. Go to the **Modifier Properties** tab
3. Navigate to the **Light Vectors modifier** and click the small **dropdown arrow**
4. Select **Copy to Selected**
<div>
<video width="100%" controls style="border-radius: 8px; margin: 15px 0;">
  <source src="/match the lighting.mp4" type="video/mp4" />
</video>
</div>

## Missing Textures ?
1. Go to the top menu and select **File > External Data > Find Missing Files**
2. Navigate to the folder where the texture images are stored
3. Click **Find Missing Files**
<div>
<video width="100%" controls style="border-radius: 8px; margin: 15px 0;">
  <source src="/missing textures1.mp4" type="video/mp4" />
  Your browser is a dinosaur and can't play videos lol
</video>
</div>

<br>

# **OR**

<br>

1. Open **Shading** workspace and select the object
2. Locate the **Image Texture node** (Diffuse, Lightmap or Normal map)
3. Click the **X** button next to the image name, then click the Folder icon **(Open Image)**
4. Browse to the exact location of the texture images file, select it, and click **Open**
<div>
<video width="100%" controls style="border-radius: 8px; margin: 15px 0;">
  <source src="/missing textures2.mp4" type="video/mp4">
  Your browser is a dinosaur and can't play videos lol
</video>
</div>

## <span style="color: #eea5a5;">ᯠ ⑅ ᯄ</span>
If there's any problem with the assets, you can reach me out at [Aplaybox](https://www.aplaybox.com/u/360614211)

<img 
  src="/pic 4.png" 
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