// Dark cut of v7-stanford: same shots, suspense voice-over (script.json), dark soundtrack and grade (lib/dark.js).
window.DARK_OPTS = {
  dark: true, loudness: -14, bed: 0.32, duck: 0.6,
  music: () => ({ style: "dark", root: 36, heart: [[SEG.arrest.start, SEG.arrest.next, 62, 74], [SEG.revolt.start, SEG.stop.next, 74, 104]] }),
  hits: [["arrest", "police", 0.04], ["revolt", "révolte", 0.05], ["claim", "bourreaux", 0.04], ["twist", "simulé", 0.04]],
  sfx() {
    sfx(SEG.arrest.start + 0.1, "rumble", { dur: 2.0, gain: 0.5 });
    sfx(wt("revolt", "extincteurs", 3.2) - 0.3, "dark_whoosh", { gain: 0.6, dur: 0.9 });
    sfx(wt("recruit", "tirés", 4.6) - 0.3, "click", { gain: 0.6 });
  },
};
