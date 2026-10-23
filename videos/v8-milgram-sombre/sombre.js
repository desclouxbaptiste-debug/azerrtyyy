// Dark cut of v8-milgram: same shots, suspense voice-over (script.json), dark soundtrack and grade (lib/dark.js).
// Electrical crackle and a clock under the whole story; after "plus rien" everything drops to silence.
window.DARK_OPTS = {
  dark: true, loudness: -14, bed: 0.3, duck: 0.6,
  music: () => ({ style: "dark", root: 37, crackle: true, tick: true, heart: [[SEG.machine.start, wt("protest", "rien", 3.4), 66, 112], [SEG.prod.start + 1.2, SEG.prod.next, 80, 90]] }),
  hits: [["hook", "volts", 0.04], ["roles", "truqué", 0.05], ["fake", "faux", 0.04], ["prod", "exige", 0.05], ["nuance", "téléphone", 0.03]],
  sfx() {
    const tk = wt("protest", "tape", 1.6) - 0.2; for (let n = 0; n < 3; n++) sfx(tk + n * 0.35, "hit", { gain: 0.55 });
    const end = wtEnd("protest", "rien", 3.8) + 0.05;
    sfx(end, "silence", { dur: Math.max(0.6, SEG.prod.sentences[0].start - end - 0.1) });
    sfx(wt("machine", "15", 1.4) - 0.1, "static", { dur: 0.5, gain: 0.35 });
  },
};
