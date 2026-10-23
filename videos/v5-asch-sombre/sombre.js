// Dark cut of v5-asch: same shots, suspense voice-over (script.json), dark soundtrack and grade (lib/dark.js).
window.DARK_OPTS = {
  dark: true, loudness: -14, bed: 0.32, duck: 0.6,
  music: () => ({ style: "dark", root: 38, heart: [[SEG.twist.start, SEG.twist.next + 0.4, 66, 98], [SEG.why.start + 0.5, SEG.why.next, 72, 84]] }),
  hits: [["hook", "quatre", 0.04], ["setup", "complices", 0.05], ["twist", "mauvaise", 0.04], ["result", "75", 0.05], ["ally", "effondre", 0.05], ["nuance", "moutons", 0.03]],
  sfx() {
    for (let i = 0; i < 7; i++) sfx(wt("twist", "mauvaise", 2.4) - 0.6 + i * 0.16 + (i >= 6 ? 0.16 : 0), "click", { gain: 0.45 });
  },
};
