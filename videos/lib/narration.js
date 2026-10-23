// Narrated videos: loads the voice-over timings (written by tts.py) and draws word-by-word subtitles.
// Classic script, load after core.js.

// Turns timings.json into subtitle "cards" of 1-3 words (never across sentences), each word timed.
function buildCaptions(timings, { maxChars = 16, maxWords = 3 } = {}) {
  const cards = [];
  for (const seg of timings.segments) for (const s of seg.sentences) {
    let cur = [];
    const flush = () => { if (cur.length) cards.push({ words: cur, start: cur[0].s, end: cur[cur.length - 1].e, seg: seg.id }); cur = []; };
    for (const w of s.words) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (cur.length && (len > maxChars || cur.length >= maxWords)) flush();
      cur.push(w);
      if (/[,.;:!?…]$/.test(w.w)) flush();
    }
    flush();
  }
  // a card stays up until the next one starts (no flicker in short pauses)
  cards.forEach((c, i) => { c.until = i + 1 < cards.length ? Math.min(cards[i + 1].start, c.end + 0.6) : c.end + 0.6; });
  return cards;
}

// White bold words with a thick dark outline; the word being spoken turns accent colour and pops.
// style "box": the spoken word sits on an accent-coloured box (punchier, TikTok-like)
function drawCaptions(cards, t, { y = 1300, size = 80, font = "MontX", accent = "#FFD23F", keyColor = null, maxW = 940, style = "plain" } = {}) {
  const c = cards.find(c => t >= c.start - 0.05 && t < c.until);
  if (!c) return;
  const appear = easeOutBack(prog(t, c.start - 0.05, c.start + 0.12), 2.2);
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const words = c.words.map(w => ({ ...w, text: w.w.toUpperCase().replace(/[,.;:…]+$/, "") }));
  const space = size * (style === "box" ? 0.62 : 0.42); // outline / highlight box need room between words
  const widths = words.map(w => ctx.measureText(w.text).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  const fit = Math.min(1, maxW / total);
  let x = W / 2 - total / 2;
  const s = (0.85 + 0.15 * appear) * fit;
  ctx.translate(W / 2, y); ctx.scale(s, s); ctx.translate(-W / 2, -y);
  ctx.globalAlpha = clamp(appear * 1.5);
  words.forEach((w, i) => {
    const active = t >= w.s - 0.03 && (i === words.length - 1 || t < words[i + 1].s - 0.03);
    const key = keyColor && keyColor(w.text);
    const pop = active ? 1 + (style === "box" ? 0.08 : 0.06) * (1 - easeOutCubic(prog(t, w.s - 0.03, w.s + 0.18))) : 1;
    ctx.save(); ctx.translate(x + widths[i] / 2, y); ctx.scale(pop, pop);
    if (style === "box" && active) {
      const bw = widths[i] + size * 0.4, bh = size * 1.2;
      ctx.save(); ctx.rotate(-0.03); ctx.fillStyle = accent; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
      ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, size * 0.22); ctx.fill(); ctx.restore();
      ctx.font = `${size}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#0B0C12"; ctx.fillText(w.text, 0, size * 0.04);
      ctx.restore(); x += widths[i] + space; return;
    }
    ctx.font = `${size}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = size * 0.2; ctx.strokeStyle = "#090b12";
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.strokeText(w.text, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = active ? accent : key || "#ffffff";
    ctx.fillText(w.text, 0, 0);
    ctx.restore();
    x += widths[i] + space;
  });
  ctx.restore();
}

// segment helpers: seg(id) -> {start, end}; local time inside a segment
function segmentIndex(timings) {
  const map = {};
  timings.segments.forEach((s, i) => { map[s.id] = { ...s, i, next: timings.segments[i + 1] ? timings.segments[i + 1].start : timings.duration }; });
  return map;
}
// time at which a given word (first match, case-insensitive, accents kept) is spoken inside a segment
function wordTime(seg, needle, fallback = 0) {
  const n = needle.toLowerCase();
  for (const s of seg.sentences) for (const w of s.words) {
    const x = w.w.toLowerCase().replace(/[,.;:!?…«»"]/g, "");
    if (x.startsWith(n) || x.replace(/^[a-zàâçéèêëîïôûùüÿœ]{1,3}['’]/, "").startsWith(n)) return w.s; // "s'effondre" matches "effondre"
  }
  return seg.start + fallback;
}
