// Dark cut of v9-hawthorne: same shots, suspense voice-over (script.json), dark soundtrack and grade (lib/dark.js).
window.DARK_OPTS = {
  dark: true, loudness: -14, bed: 0.32, duck: 0.6,
  music: () => ({ style: "dark", root: 39, heart: [[SEG.weird.start, SEG.weird.next, 62, 88]] }),
  hits: [["hook", "regarde", 0.04], ["light", "monte", 0.03], ["relay", "grimpe", 0.04], ["lesson", "mesuré", 0.03]],
  sfx() {
    sfx(wt("weird", "baisse", 5) - 0.3, "dark_whoosh", { gain: 0.5, dur: 0.8 });
  },
};
