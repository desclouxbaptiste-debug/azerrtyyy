(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const body = document.body;

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage unavailable: state stays in memory */
      }
    },
  };

  /* ---------------- Toast ---------------- */
  const toastEl = $(".toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
  }

  /* ---------------- Stats count-up ---------------- */
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp(el, i) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || "";
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const fmt = (n) => n.toFixed(decimals) + suffix;

    if (reduceMotion) {
      el.textContent = fmt(target);
      return;
    }
    const duration = 1500 + i * 80;
    const delay = 480 + i * 90;
    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = fmt(target * easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  }

  const statValues = $$(".stat-value");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target, statValues.indexOf(entry.target));
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );
    statValues.forEach((el) => io.observe(el));
  } else {
    statValues.forEach(countUp);
  }

  /* ---------------- Mobile menu ---------------- */
  const burger = $(".burger");
  const menu = $(".mobile-menu");
  const menuOverlay = $(".menu-overlay");

  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    menu.hidden = !open;
    menuOverlay.hidden = !open;
    body.classList.toggle("menu-open", open);
  }

  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  menuOverlay.addEventListener("click", () => setMenu(false));
  $$("a, button", menu).forEach((el) => el.addEventListener("click", () => setMenu(false)));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720 && !menu.hidden) setMenu(false);
  });

  /* ---------------- Panels ---------------- */
  const panelOverlay = $(".panel-overlay");
  const panels = {
    studio: $("#panel-studio"),
    pricing: $("#panel-pricing"),
    contact: $("#panel-contact"),
  };
  let openPanel = null;
  let lastFocus = null;

  function showPanel(name) {
    const panel = panels[name];
    if (!panel) return;
    if (openPanel && openPanel !== panel) openPanel.hidden = true;
    else lastFocus = document.activeElement;
    openPanel = panel;
    panelOverlay.hidden = false;
    panel.hidden = false;
    const first = $("input, textarea, .panel-close", panel);
    if (first) first.focus({ preventScroll: true });
    if (name === "studio") refreshPlanUI();
  }

  function hidePanel() {
    if (!openPanel) return;
    openPanel.hidden = true;
    panelOverlay.hidden = true;
    openPanel = null;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open]");
    if (!trigger) return;
    e.preventDefault();
    showPanel(trigger.dataset.open);
  });
  $$(".panel-close").forEach((b) => b.addEventListener("click", hidePanel));
  panelOverlay.addEventListener("click", hidePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openPanel) hidePanel();
    else if (!menu.hidden) setMenu(false);
  });

  /* ---------------- Plans & quota ---------------- */
  const PLANS = {
    free: { name: "Gratuit", quota: 3, maxClips: 5, rank: 0 },
    creator: { name: "Créateur", quota: 50, maxClips: 8, rank: 1 },
    pro: { name: "Pro", quota: Infinity, maxClips: 12, rank: 2 },
  };
  const monthKey = new Date().toISOString().slice(0, 7);
  let plan = store.get("clipzo.plan", "free");
  if (!PLANS[plan]) plan = "free";
  let usage = store.get("clipzo.usage", { month: monthKey, used: 0 });
  if (usage.month !== monthKey) usage = { month: monthKey, used: 0 };

  const remaining = () => PLANS[plan].quota - usage.used;
  const hasPlan = (min) => PLANS[plan].rank >= PLANS[min].rank;

  function refreshPlanUI() {
    const p = PLANS[plan];
    $(".plan-name").textContent = p.name;
    $(".quota").textContent =
      p.quota === Infinity
        ? "Shorts illimités"
        : `${Math.max(0, remaining())} / ${p.quota} shorts restants ce mois-ci`;

    $$(".opt[data-min]").forEach((opt) => {
      const locked = !hasPlan(opt.dataset.min);
      opt.classList.toggle("is-locked", locked);
      if (locked) $("input", opt).checked = false;
    });
    $$(".lock[data-min]").forEach((l) => l.classList.toggle("is-hidden", hasPlan(l.dataset.min)));
    const checkedCount = $('input[name="count"]:checked');
    if (checkedCount && +checkedCount.value > p.maxClips) $('input[name="count"][value="3"]').checked = true;

    $$(".plan").forEach((card) => card.classList.toggle("is-current", card.dataset.plan === plan));
    $$("[data-choose]").forEach((btn) => {
      const isCur = btn.dataset.choose === plan;
      btn.textContent = isCur ? "Forfait actuel" : btn.dataset.label;
      btn.disabled = isCur;
    });
  }

  $$("[data-choose]").forEach((btn) => {
    btn.dataset.label = btn.textContent;
    btn.addEventListener("click", () => {
      plan = btn.dataset.choose;
      store.set("clipzo.plan", plan);
      refreshPlanUI();
      toast(`Forfait ${PLANS[plan].name} activé (démo — aucun paiement)`);
      setTimeout(() => showPanel("studio"), 500);
    });
  });

  // Locked options / counts → nudge to pricing
  $$(".opt[data-min] input").forEach((input) => {
    input.addEventListener("change", () => {
      const min = input.closest(".opt").dataset.min;
      if (!hasPlan(min)) {
        input.checked = false;
        toast(`Option disponible avec le forfait ${PLANS[min].name}`);
      }
    });
  });
  $$('input[name="count"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (+input.value > PLANS[plan].maxClips) {
        const min = +input.value > PLANS.creator.maxClips ? "pro" : "creator";
        $('input[name="count"][value="3"]').checked = true;
        toast(`${input.value} shorts par vidéo : forfait ${PLANS[min].name}`);
      }
    });
  });

  // Billing toggle
  $$(".bill").forEach((b) =>
    b.addEventListener("click", () => {
      const yearly = b.dataset.bill === "year";
      $$(".bill").forEach((x) => {
        const on = x === b;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-checked", String(on));
      });
      $$(".amount").forEach((a) => (a.textContent = yearly ? a.dataset.year : a.dataset.month));
      $$(".per").forEach((p) => (p.textContent = yearly ? "/mois, facturé à l'année" : "/mois"));
    })
  );

  refreshPlanUI();

  /* ---------------- Studio ---------------- */
  const PLATFORMS = [
    { id: "youtube", name: "YouTube", icon: "fa-brands fa-youtube", color: "#ff0033", re: /(?:youtube\.com|youtu\.be)/i },
    { id: "twitch", name: "Twitch", icon: "fa-brands fa-twitch", color: "#9146ff", re: /twitch\.tv/i },
    { id: "tiktok", name: "TikTok", icon: "fa-brands fa-tiktok", color: "#25f4ee", re: /tiktok\.com/i },
    { id: "x", name: "X", icon: "fa-brands fa-x-twitter", color: "#ffffff", re: /(?:twitter\.com|x\.com)/i },
    { id: "kick", name: "Kick", icon: "fa-solid fa-k", color: "#53fc18", re: /kick\.com/i },
    { id: "instagram", name: "Instagram", icon: "fa-brands fa-instagram", color: "#e1306c", re: /instagram\.com/i },
  ];

  const form = $(".studio-form");
  const urlInput = $(".url-input");
  const platformIcon = $(".platform-icon");
  const urlHint = $(".url-hint");
  const errorEl = $(".form-error");
  const range = $(".range");
  const durationOut = $(".duration-out");
  const progress = $(".progress");
  const results = $(".results");
  const clipsList = $(".clips");

  const fmtDuration = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} min ${String(r).padStart(2, "0")}` : `${m} min`;
  };
  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = Math.floor(s % 60);
    const mm = String(m).padStart(h ? 2 : 1, "0");
    return (h ? h + ":" : "") + mm + ":" + String(r).padStart(2, "0");
  };

  range.addEventListener("input", () => (durationOut.textContent = fmtDuration(+range.value)));

  function parseUrl(raw) {
    let url;
    try {
      url = new URL(raw.trim().match(/^https?:\/\//i) ? raw.trim() : "https://" + raw.trim());
    } catch {
      return null;
    }
    const platform = PLATFORMS.find((p) => p.re.test(url.hostname));
    if (!platform) return null;
    let ytId = null;
    if (platform.id === "youtube") {
      ytId =
        url.searchParams.get("v") ||
        (url.hostname.includes("youtu.be") ? url.pathname.slice(1) : null) ||
        (url.pathname.match(/\/(?:shorts|live|embed)\/([\w-]{11})/) || [])[1] ||
        null;
      if (ytId && !/^[\w-]{11}$/.test(ytId)) ytId = null;
    }
    return { url, platform, ytId };
  }

  urlInput.addEventListener("input", () => {
    errorEl.hidden = true;
    const parsed = urlInput.value.trim() ? parseUrl(urlInput.value) : null;
    platformIcon.className = (parsed ? parsed.platform.icon : "fa-solid fa-link") + " platform-icon";
    platformIcon.style.color = parsed ? parsed.platform.color : "";
    urlHint.textContent = parsed
      ? `${parsed.platform.name} détecté`
      : "YouTube, Twitch (VOD & clips), TikTok, X, Kick, Instagram";
  });

  // Deterministic pseudo-random from the URL, so the same link gives the same cuts
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  const MOMENTS = [
    { title: "Le moment où tout bascule", sub: "J'ai <mark>jamais</mark> vu ça de ma vie", tags: "#reaction #fyp" },
    { title: "Fou rire incontrôlable", sub: "Attends attends… <mark>regarde</mark> ça", tags: "#funny #clip" },
    { title: "Le clutch impossible en 1v4", sub: "Il reste <mark>un</mark> seul PV !", tags: "#gaming #clutch" },
    { title: "Il révèle enfin la vérité", sub: "Personne vous l'a <mark>dit</mark> mais…", tags: "#storytime #viral" },
    { title: "La réaction du chat en direct", sub: "Le chat est en <mark>feu</mark> là", tags: "#twitch #live" },
    { title: "Le conseil qui change tout", sub: "Fais <mark>ça</mark> et tu vas voir", tags: "#astuce #tips" },
    { title: "Rage quit légendaire", sub: "Non mais c'est <mark>pas</mark> possible", tags: "#ragequit #fail" },
    { title: "Le plot twist de la fin", sub: "Et là… <mark>surprise</mark>", tags: "#plottwist #wow" },
    { title: "Débat qui part en vrille", sub: "Tu dis <mark>n'importe</mark> quoi !", tags: "#debat #drama" },
    { title: "La prédiction qui se réalise", sub: "Je vous l'avais <mark>dit</mark>", tags: "#prediction #shorts" },
    { title: "Instant émotion", sub: "Merci à <mark>vous</mark> tous", tags: "#emotion #community" },
    { title: "Le record est battu", sub: "C'est <mark>historique</mark> !", tags: "#record #win" },
  ];

  const GRADIENTS = [
    "linear-gradient(160deg,#ff3b5c,#3a0ca3)",
    "linear-gradient(160deg,#9146ff,#0b0b0f)",
    "linear-gradient(160deg,#25f4ee,#fe2c55)",
    "linear-gradient(160deg,#ffb703,#d62828)",
    "linear-gradient(160deg,#06d6a0,#073b4c)",
    "linear-gradient(160deg,#4361ee,#111)",
  ];

  function buildClips(parsed, duration, count, opts) {
    const rand = seeded(parsed.url.href);
    // Estimated source length: Twitch VODs are long, TikToks are short-ish
    const sourceLen =
      parsed.platform.id === "twitch" ? 3600 * (2 + Math.floor(rand() * 4)) :
      parsed.platform.id === "tiktok" || parsed.platform.id === "instagram" ? 300 + Math.floor(rand() * 600) :
      900 + Math.floor(rand() * 2700);

    const slot = Math.max(duration, Math.floor(sourceLen / count));
    const pool = MOMENTS.slice().sort(() => rand() - 0.5);
    const clips = [];
    for (let i = 0; i < count; i++) {
      const jitter = Math.floor(rand() * Math.max(1, slot - duration));
      const start = Math.min(i * slot + jitter, Math.max(0, sourceLen - duration));
      const len = Math.max(60, Math.min(180, duration + Math.round((rand() - 0.5) * 20)));
      clips.push({
        ...pool[i % pool.length],
        start,
        end: start + len,
        len,
        score: Math.round(62 + rand() * 37),
      });
    }
    clips.sort((a, b) => b.score - a.score);
    return clips.map((c) => ({ ...c, opts }));
  }

  function renderClips(parsed, clips) {
    const thumb = parsed.ytId ? `url("https://i.ytimg.com/vi/${parsed.ytId}/hqdefault.jpg")` : null;
    clipsList.innerHTML = "";
    clips.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "clip";
      li.style.setProperty("--i", i);
      const bg = thumb || GRADIENTS[i % GRADIENTS.length];
      li.innerHTML = `
        <div class="clip-thumb" style='background-image:${bg}'>
          <span class="clip-score ${c.score >= 85 ? "hot" : ""}">🔥 ${c.score}%</span>
          <span class="clip-dur">${fmtTime(c.len)}</span>
          ${c.opts.subs || c.opts.animsubs ? `<span class="clip-sub">${c.sub}</span>` : ""}
          ${c.opts.nowm ? "" : '<span class="clip-wm">clipzo</span>'}
          <span class="clip-play"><i class="fa-solid fa-play"></i></span>
        </div>
        <p class="clip-title"></p>
        <p class="clip-meta">${fmtTime(c.start)} → ${fmtTime(c.end)} · ${parsed.platform.name}</p>
        ${c.opts.hooks ? `<p class="clip-tags">${c.tags} #shorts</p>` : ""}
        <button class="clip-dl" type="button"><i class="fa-solid fa-download"></i> Exporter</button>`;
      $(".clip-title", li).textContent = c.title;
      $(".clip-dl", li).addEventListener("click", () =>
        toast("Démo : l'export MP4 sera disponible une fois le backend branché")
      );
      clipsList.appendChild(li);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runAnalysis(parsed, duration, count, opts) {
    form.hidden = true;
    results.hidden = true;
    progress.hidden = false;
    const thumb = $(".progress-thumb");
    thumb.style.backgroundImage = parsed.ytId
      ? `url("https://i.ytimg.com/vi/${parsed.ytId}/hqdefault.jpg")`
      : GRADIENTS[0];

    const steps = $$(".steps li");
    const bar = $(".bar span");
    steps.forEach((s) => s.classList.remove("is-active", "is-done"));
    bar.style.width = "0%";

    const stepMs = reduceMotion ? 120 : 850;
    for (let i = 0; i < steps.length; i++) {
      steps[i].classList.add("is-active");
      bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      await sleep(stepMs);
      steps[i].classList.replace("is-active", "is-done");
    }

    renderClips(parsed, buildClips(parsed, duration, count, opts));
    progress.hidden = true;
    results.hidden = false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = parseUrl(urlInput.value);
    if (!parsed) {
      errorEl.textContent = "Colle un lien valide YouTube, Twitch, TikTok, X, Kick ou Instagram.";
      errorEl.hidden = false;
      urlInput.focus();
      return;
    }
    const count = +$('input[name="count"]:checked').value;
    if (remaining() < count) {
      errorEl.textContent =
        remaining() <= 0
          ? `Tu as utilisé tes ${PLANS[plan].quota} shorts du mois. Passe à un forfait supérieur pour continuer.`
          : `Il te reste ${remaining()} short(s) ce mois-ci. Réduis le nombre ou passe à un forfait supérieur.`;
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    const fd = new FormData(form);
    const opts = {
      reframe: fd.has("reframe"),
      subs: fd.has("subs"),
      nowm: fd.has("nowm"),
      hooks: fd.has("hooks"),
      animsubs: fd.has("animsubs"),
    };

    usage.used += count;
    store.set("clipzo.usage", usage);
    refreshPlanUI();
    runAnalysis(parsed, +range.value, count, opts);
  });

  $(".restart").addEventListener("click", () => {
    results.hidden = true;
    form.hidden = false;
    urlInput.select();
  });

  /* ---------------- Contact ---------------- */
  $(".contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!e.target.reportValidity()) return;
    e.target.reset();
    hidePanel();
    toast("Message envoyé — on te répond sous 24 h (démo)");
  });

  // Deep links: #studio, #tarifs, #contact
  const hashMap = { "#studio": "studio", "#tarifs": "pricing", "#contact": "contact" };
  if (hashMap[location.hash]) showPanel(hashMap[location.hash]);
})();
