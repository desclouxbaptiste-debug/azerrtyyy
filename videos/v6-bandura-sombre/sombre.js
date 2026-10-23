// Dark cut of v6-bandura: same shots, suspense voice-over (script.json), dark soundtrack and grade (lib/dark.js).
window.DARK_OPTS = {
  dark: true, loudness: -14, bed: 0.34, duck: 0.6,
  music: () => ({ style: "dark", root: 40, musicbox: true, heart: [[SEG.room.start, SEG.result.start + 0.6, 64, 94]] }),
  hits: [["hook", "devine", 0.04], ["setup", "72", 0.03], ["tease", "réservés", 0.04], ["boys", "coups", 0.04], ["nuance", "frappé", 0.03]],
  sfx() {
    for (const h of hitsBetween(SEG.hook.start, SEG.hook.next, 1.5, SEG.hook.start)) sfx(h, "hit", { gain: 0.3 });
    for (const h of hitsBetween(SEG.result.start + 0.3, SEG.result.next, 1.7, SEG.result.start + 0.3)) sfx(h, "hit", { gain: 0.25 });
  },
};
