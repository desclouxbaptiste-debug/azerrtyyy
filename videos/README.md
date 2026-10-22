# Vidéos courtes (TikTok / Reels / Shorts)

Chaque dossier est une vidéo 1080×1920 générée en code :

- `scene.html` : l'animation (canvas), avec une fonction `render(t)` déterministe
- `audio.py` : musique et bruitages synthétisés (numpy), calés sur les événements exportés par la scène
- `render.mjs` : capture chaque image avec Chromium (Playwright) et assemble le MP4 avec ffmpeg

```bash
cd videos/demo-faits
NODE_PATH=$(npm root -g) node render.mjs                # -> out/demo-5-faits.mp4
NODE_PATH=$(npm root -g) node render.mjs --stills 3,8   # aperçus JPG seulement
```

Polices : Anton et Montserrat (Google Fonts, licence OFL) dans `fonts/`.
