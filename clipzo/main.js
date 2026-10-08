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

  // Per-tab memory (active analysis job), so a reload resumes where it was
  const session = {
    get(key) {
      try {
        const v = sessionStorage.getItem(key);
        return v === null ? null : JSON.parse(v);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage unavailable: the job is only followed until the page closes */
      }
    },
    remove(key) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* nothing to clean */
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
    account: $("#panel-account"),
  };
  let openPanel = null;
  let lastFocus = null;
  const panelName = (panel) => Object.keys(panels).find((k) => panels[k] === panel) || null;

  // A hidden panel keeps playing its videos: pause them when it closes
  const pauseMedia = (root) => $$("video", root).forEach((v) => v.pause());
  const isShown = (node) => node.getClientRects().length > 0;

  function showPanel(name) {
    const panel = panels[name];
    if (!panel) return;
    if (name === "account") renderAccount();
    if (openPanel && openPanel !== panel) {
      pauseMedia(openPanel);
      openPanel.hidden = true;
    } else lastFocus = document.activeElement;
    openPanel = panel;
    panelOverlay.hidden = false;
    panel.hidden = false;
    setBackgroundInert(true);
    // A [data-autofocus] field wins (account email), otherwise the first control as before
    const first = $$("[data-autofocus]", panel).concat($$("input, textarea, .panel-close", panel)).find(isShown);
    if (first) first.focus({ preventScroll: true });
    if (name === "studio") {
      refreshPlanUI();
      onStudioOpen();
    }
    if (name === "pricing") refreshFeatures();
  }

  function hidePanel() {
    if (!openPanel) return;
    if (openPanel === panels.account) authBack = null;
    pauseMedia(openPanel);
    openPanel.hidden = true;
    panelOverlay.hidden = true;
    openPanel = null;
    setBackgroundInert(false);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  // aria-modal panels: keyboard focus must not reach the page underneath
  function setBackgroundInert(on) {
    $$(".page, .mobile-menu").forEach((node) => {
      node.inert = on;
    });
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open]");
    if (!trigger) return;
    e.preventDefault();
    // Signing in from the studio or the pricing brings the person back there afterwards
    if (trigger.dataset.open === "account") openAccount(trigger.dataset.mode, "", panelName(openPanel));
    else showPanel(trigger.dataset.open);
  });
  $$(".panel-close").forEach((b) => b.addEventListener("click", hidePanel));
  panelOverlay.addEventListener("click", hidePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openPanel) hidePanel();
    else if (!menu.hidden) setMenu(false);
  });

  /* ---------------- Plans, account & quota ---------------- */
  const PLANS = {
    free: { name: "Gratuit", quota: 3, maxClips: 5, rank: 0 },
    creator: { name: "Créateur", quota: 50, maxClips: 8, rank: 1 },
    pro: { name: "Pro", quota: Infinity, maxClips: 12, rank: 2 },
  };
  // Live mode: the plan and the monthly quota belong to the signed-in account, the server charges them.
  // Demo mode (no server): the plan is a local switch to try the options, nothing is ever charged.
  const api = { mode: "pending", features: {}, adminCommand: "", checking: null, me: null };
  const isLive = () => api.mode === "live";
  let demoPlan = store.get("clipzo.plan", "free");
  if (!PLANS[demoPlan]) demoPlan = "free";
  let currentUser = null; // live mode: the signed-in account (/api/me), null when logged out
  let activeJob = null; // the server analysis being followed (live mode)
  let billingInterval = "month";
  let authMode = "login";
  let authBack = null; // panel to bring back once signed in ("studio", "pricing")

  const planKey = () => (isLive() ? (currentUser ? currentUser.plan : "free") : demoPlan);
  const hasPlan = (min) => PLANS[planKey()].rank >= PLANS[min].rank;

  // Shorts that can still be requested this month (Infinity: unlimited)
  function shortsLeft() {
    if (!isLive()) return PLANS[demoPlan].quota;
    if (!currentUser) return 0;
    return currentUser.quota.remaining === null ? Infinity : currentUser.quota.remaining;
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== "clipzo.plan") return;
    const p = store.get("clipzo.plan", demoPlan);
    if (PLANS[p]) demoPlan = p;
    refreshPlanUI();
  });

  const memberBar = $(".plan-bar-member");
  const guestBar = $(".plan-bar-guest");
  const accountTitle = $("#account-title");
  const authBox = $(".auth");
  const authIntro = $(".auth-intro");
  const authIntroText = $(".auth-intro-text");
  const authForm = $(".auth-form");
  const authEmail = $("#auth-email");
  const authPassword = $("#auth-password");
  const pwToggle = $(".pw-toggle");
  const pwHint = $(".pw-hint");
  const authError = $(".auth-error");
  const authSubmit = $(".auth-submit");
  const authNote = $(".auth-note");
  const acctBox = $(".acct");
  const acctAvatar = $(".acct-avatar");
  const acctEmail = $(".acct-email");
  const acctPlan = $(".acct-plan");
  const acctQuota = $(".acct-quota");
  const meter = $(".meter");
  const meterUsed = $(".meter-used");
  const meterReserved = $(".meter-reserved");
  const acctSub = $(".acct-sub");
  const acctRenew = $(".acct-renew");
  const acctManage = $(".acct-manage");
  const acctLogout = $(".acct-logout");

  function quotaLine(user) {
    if (user) {
      const q = user.quota;
      return q.remaining === null || q.limit === null
        ? "Shorts illimités"
        : `${q.remaining} / ${q.limit} shorts restants ce mois-ci`;
    }
    const p = PLANS[planKey()];
    return p.quota === Infinity ? "Shorts illimités" : `${p.quota} / ${p.quota} shorts restants ce mois-ci`;
  }

  // Live server without Stripe: say so on the pricing page instead of failing at each click.
  // On the owner's own computer, also show how to give an account a plan by hand to test it.
  const billingBanner = $(".billing-banner");
  const billingOff = () => isLive() && api.features.billing === false;
  const onOwnComputer = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/.test(location.hostname);

  function refreshBillingBanner(user) {
    billingBanner.hidden = !billingOff();
    $(".billing-local", billingBanner).hidden = !onOwnComputer;
    const tip = !user ? "guest" : user.plan === "free" ? "free" : "paid";
    $$(".billing-tip", billingBanner).forEach((t) => (t.hidden = t.dataset.tip !== tip));
    // The server says how its admin commands run (Docker, Windows…); the browser's OS as a fallback
    const admin = api.adminCommand || (/Windows/i.test(navigator.userAgent) ? "py" : "python3") + " -m server.admin";
    // Only plain addresses go in the command: no quoting is safe in cmd, PowerShell and sh at once
    const email = user && /^[\w.@+-]+$/.test(user.email) ? user.email : "ton@email";
    const cmd = `${admin} set-plan ${email} ${tip === "paid" ? "free" : "pro"}`;
    $$(".billing-cmd", billingBanner).forEach((c) => (c.textContent = cmd));
  }

  function refreshPlanUI() {
    const key = planKey();
    const p = PLANS[key];
    const user = isLive() ? currentUser : null;
    const guest = isLive() && !user;

    memberBar.hidden = guest;
    guestBar.hidden = !guest;
    $(".plan-name").textContent = user ? user.label : p.name;
    $(".quota").textContent = quotaLine(user);

    $$(".opt[data-min]").forEach((opt) => {
      const locked = !hasPlan(opt.dataset.min);
      opt.classList.toggle("is-locked", locked);
      if (locked) $("input", opt).checked = false;
    });
    $$(".lock[data-min]").forEach((l) => l.classList.toggle("is-hidden", hasPlan(l.dataset.min)));
    const checkedCount = $('input[name="count"]:checked');
    if (checkedCount && +checkedCount.value > p.maxClips) $('input[name="count"][value="3"]').checked = true;

    $$(".plan").forEach((card) => card.classList.toggle("is-current", !guest && card.dataset.plan === key));
    $$("[data-choose]").forEach((btn) => {
      if (btn.classList.contains("is-loading")) return;
      const choice = btn.dataset.choose;
      const isCur = !guest && choice === key;
      // A paid account goes back to free by cancelling its subscription (Stripe portal)
      const downgrade = !!user && choice === "free" && key !== "free";
      btn.textContent = isCur ? "Forfait actuel" : downgrade ? "Revenir au Gratuit" : btn.dataset.label;
      btn.disabled = isCur || (downgrade && !user.billing.canManage);
    });

    $$(".sign-in, .m-sign-in").forEach((b) => (b.textContent = user ? "Mon compte" : "Connexion"));
    refreshBillingBanner(user);
    if (openPanel === panels.account) renderAccount();
  }

  $$("[data-choose]").forEach((btn) => {
    btn.dataset.label = btn.textContent;
    btn.addEventListener("click", () => choosePlan(btn));
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
      if (+input.value > PLANS[planKey()].maxClips) {
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
      billingInterval = yearly ? "year" : "month";
      $$(".bill").forEach((x) => {
        const on = x === b;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-checked", String(on));
      });
      $$(".amount").forEach((a) => (a.textContent = yearly ? a.dataset.year : a.dataset.month));
      $$(".per").forEach((p) => (p.textContent = yearly ? "/mois, facturé à l'année" : "/mois"));
    })
  );

  /* ---------- Account (live mode) ---------- */
  const MSG_OFFLINE = "Impossible de joindre le serveur Clipzo. Vérifie ta connexion puis réessaie.";

  // JSON call to the API. Same origin: the HttpOnly session cookie goes along. Rejects on network errors only
  function apiCall(method, url, payload) {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 15000);
    const init = {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: ctrl ? ctrl.signal : undefined,
    };
    if (payload !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(payload);
    }
    return fetch(url, init)
      .then((res) => res.json().then((data) => ({ status: res.status, data }), () => ({ status: res.status, data: null })))
      .finally(() => clearTimeout(timer));
  }

  // Server account → trusted shape (numbers checked, texts trimmed; they only ever reach textContent)
  function readUser(raw) {
    if (!raw || typeof raw !== "object" || !text(raw.email)) return null;
    const plan = PLANS[raw.plan] ? raw.plan : "free";
    const q = raw.quota && typeof raw.quota === "object" ? raw.quota : {};
    const b = raw.billing && typeof raw.billing === "object" ? raw.billing : {};
    const count = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
    const used = count(q.used) || 0;
    const reserved = count(q.reserved) || 0;
    const limit = count(q.limit); // null: unlimited
    const left = count(q.remaining);
    return {
      email: text(raw.email),
      plan,
      label: text(raw.plan_label) || PLANS[plan].name,
      quota: {
        limit,
        used,
        reserved,
        remaining: limit === null ? null : left === null ? Math.max(0, limit - used - reserved) : left,
        month: text(q.month),
      },
      billing: {
        status: text(b.status),
        renewsAt: Number.isFinite(b.renews_at) && b.renews_at > 0 ? b.renews_at * 1000 : null,
        cancelAtEnd: b.cancel_at_period_end === true,
        canManage: b.can_manage === true,
      },
    };
  }

  function setUser(raw) {
    currentUser = readUser(raw);
    refreshPlanUI();
  }

  // Resolves to the signed-in account (null when logged out). Unreachable server: keeps what it had
  function loadMe() {
    if (api.me) return api.me;
    api.me = apiCall("GET", "/api/me")
      .then(({ status, data }) => {
        if (status === 200 && data && typeof data === "object") setUser(data.user);
        else if (status === 401) setUser(null);
        return currentUser;
      })
      .catch(() => currentUser)
      .finally(() => {
        api.me = null;
      });
    return api.me;
  }

  // Plan or quota changed from another tab (subscription, analysis): refresh when coming back
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !isLive()) return;
    loadMe();
    refreshFeatures();
  });

  const frDate = (ms) =>
    new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }).replace(/^1 /, "1er ");

  // "2026-10" → "1er novembre": the monthly quota starts over with the next month
  function resetDay(month) {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    return m ? `1er ${new Date(+m[1], +m[2], 1).toLocaleDateString("fr-FR", { month: "long" })}` : "";
  }

  function renderAccount() {
    const user = isLive() ? currentUser : null;
    authBox.hidden = !!user;
    acctBox.hidden = !user;
    accountTitle.textContent = user ? "Mon compte" : authMode === "signup" ? "Crée ton compte" : "Connecte-toi";
    if (!user) return;

    const q = user.quota;
    const b = user.billing;
    acctAvatar.textContent = user.email.charAt(0).toUpperCase();
    acctEmail.textContent = user.email;
    acctEmail.title = user.email;
    acctPlan.textContent = user.label;
    acctPlan.dataset.plan = user.plan;

    const unlimited = q.limit === null;
    const s = q.used > 1 ? "s" : "";
    acctQuota.textContent = unlimited ? "Shorts illimités" : `${q.used} short${s} utilisé${s} sur ${q.limit} ce mois-ci`;
    meter.hidden = unlimited;
    const share = (n) => `${(Math.min(1, n / Math.max(1, q.limit)) * 100).toFixed(1)}%`;
    meterUsed.style.width = unlimited ? "0" : share(q.used);
    meterReserved.style.width = unlimited ? "0" : share(Math.min(q.reserved, Math.max(0, q.limit - q.used)));
    const sub = [];
    if (!unlimited && q.reserved > 0) {
      sub.push(`${q.reserved} réservé${q.reserved > 1 ? "s" : ""} par une analyse en cours`);
    }
    if (!unlimited && resetDay(q.month)) sub.push(`remise à zéro le ${resetDay(q.month)}`);
    const subLine = sub.join(" · ");
    acctSub.textContent = subLine.charAt(0).toUpperCase() + subLine.slice(1);
    acctSub.hidden = !subLine;

    let renew = "";
    if (b.status === "past_due" || b.status === "unpaid") {
      renew = "Paiement en attente : mets à jour ta carte depuis « Gérer mon abonnement ».";
    } else if (b.renewsAt && b.cancelAtEnd) renew = `Se termine le ${frDate(b.renewsAt)} (résiliation programmée)`;
    else if (b.renewsAt) renew = `Renouvellement le ${frDate(b.renewsAt)}`;
    acctRenew.textContent = renew;
    acctRenew.hidden = !renew;
    acctManage.hidden = !b.canManage;
  }

  // Signed out: login / sign-up form (with an optional reason). Signed in: the account summary
  async function openAccount(mode, note, back) {
    await modeReady();
    if (!isLive()) {
      showPanel("pricing"); // demo: accounts need the Clipzo server, the pricing shows what they unlock
      return;
    }
    if (api.me) await api.me;
    authBack = back && back !== "account" ? back : null;
    authIntroText.textContent = note || "";
    authIntro.hidden = !note;
    // Announced with the dialog title by screen readers
    if (note) panels.account.setAttribute("aria-describedby", authIntroText.id);
    else panels.account.removeAttribute("aria-describedby");
    authError.hidden = true;
    if (!currentUser) setAuthMode(mode || "login");
    showPanel("account");
    if (currentUser) loadMe(); // fresh quota and subscription
  }

  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";
    const signup = authMode === "signup";
    $(`input[name="auth-mode"][value="${authMode}"]`).checked = true;
    authPassword.setAttribute("autocomplete", signup ? "new-password" : "current-password");
    if (signup) {
      authPassword.minLength = 8;
      authPassword.setAttribute("aria-describedby", pwHint.id);
    } else {
      authPassword.removeAttribute("minlength");
      authPassword.removeAttribute("aria-describedby");
    }
    pwHint.hidden = !signup;
    authNote.hidden = !signup;
    if (!authSubmit.classList.contains("is-loading")) authSubmit.textContent = submitLabel();
    authError.hidden = true;
    if (!currentUser) accountTitle.textContent = signup ? "Crée ton compte" : "Connecte-toi";
  }
  const submitLabel = () => (authMode === "signup" ? "Créer mon compte" : "Se connecter");

  $$('input[name="auth-mode"]').forEach((input) => input.addEventListener("change", () => setAuthMode(input.value)));

  function setPasswordVisible(on) {
    authPassword.type = on ? "text" : "password";
    pwToggle.setAttribute("aria-pressed", String(on));
    $("i", pwToggle).className = on ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  }
  pwToggle.addEventListener("click", () => setPasswordVisible(authPassword.type === "password"));

  // Loading state of a button while the server answers
  function setBusy(btn, label) {
    btn.dataset.idle = btn.textContent;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "";
    btn.append(icon("fa-solid fa-circle-notch fa-spin"), ` ${label}`);
  }
  function setIdle(btn, label = btn.dataset.idle) {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    btn.removeAttribute("aria-busy");
    btn.textContent = label;
  }

  function authFail(message, field) {
    authError.textContent = message;
    authError.hidden = false;
    if (!field) return;
    field.focus();
    if (field === authPassword) field.select();
  }

  function authMessage(res) {
    if (!res) return MSG_OFFLINE;
    const detail = res.data && typeof res.data.detail === "string" ? res.data.detail.trim() : "";
    if (detail) return detail;
    if (res.status === 401) return "E-mail ou mot de passe incorrect.";
    if (res.status === 409) return "Un compte existe déjà avec cet e-mail : connecte-toi.";
    if (res.status === 429) return "Trop de tentatives : attends un peu puis réessaie.";
    if (res.status === 400 || res.status === 422) return "Vérifie ton e-mail et ton mot de passe (8 caractères minimum).";
    return "Le serveur n'a pas pu te connecter. Réessaie dans un instant.";
  }

  let authBusy = false;
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authBusy) return;
    const signup = authMode === "signup";
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !authEmail.checkValidity()) {
      authFail("Entre une adresse e-mail valide, par exemple toi@exemple.com.", authEmail);
      return;
    }
    if (!password) {
      authFail(signup ? "Choisis un mot de passe." : "Entre ton mot de passe.", authPassword);
      return;
    }
    if (signup && password.length < 8) {
      authFail("Ton mot de passe doit faire au moins 8 caractères.", authPassword);
      return;
    }
    authError.hidden = true;
    authBusy = true;
    setBusy(authSubmit, signup ? "Création du compte…" : "Connexion…");
    const res = await apiCall("POST", signup ? "/api/auth/signup" : "/api/auth/login", { email, password }).catch(
      () => null
    );
    authBusy = false;
    setIdle(authSubmit, submitLabel());
    if (res && res.status === 200 && res.data && readUser(res.data.user)) signedIn(res.data.user, signup);
    else authFail(authMessage(res), res && res.status === 409 ? authEmail : authPassword);
  });

  function signedIn(rawUser, isNew) {
    setUser(rawUser);
    authPassword.value = "";
    setPasswordVisible(false);
    toast(isNew ? "Bienvenue sur Clipzo : ton compte est prêt !" : "Content de te revoir !");
    const back = authBack;
    authBack = null;
    if (openPanel !== panels.account) return; // closed while the server answered
    if (!back) {
      accountTitle.focus({ preventScroll: true });
      return;
    }
    // Back where the person was: they press the button again themselves, nothing starts on its own
    showPanel(back);
    if (back === "studio" && !form.hidden) $('button[type="submit"]', form).focus({ preventScroll: true });
  }

  acctLogout.addEventListener("click", async () => {
    setBusy(acctLogout, "Déconnexion…");
    const res = await apiCall("POST", "/api/auth/logout").catch(() => null);
    setIdle(acctLogout);
    if (!res || (res.status !== 200 && res.status !== 401)) {
      toast(res ? apiError(res.status, res.data) : MSG_OFFLINE);
      return;
    }
    // Shared computer: nothing of the account that left stays on screen
    stopJob();
    showForm();
    authForm.reset();
    setUser(null);
    hidePanel();
    toast("Déconnexion réussie, à bientôt !");
  });

  /* ---------- Subscriptions (Stripe, live mode) ---------- */
  const CHECKOUT_KEY = "clipzo.checkout";

  async function choosePlan(btn) {
    await modeReady();
    const choice = btn.dataset.choose;
    if (!isLive()) {
      // Demo: switch the local plan to try its options, nothing is paid
      demoPlan = choice;
      store.set("clipzo.plan", demoPlan);
      refreshPlanUI();
      toast(`Forfait ${PLANS[demoPlan].name} activé (démo — aucun paiement)`);
      setTimeout(() => showPanel("studio"), 500);
      return;
    }
    // The server may have been restarted with Stripe since the page loaded
    if (choice !== "free" && billingOff()) await refreshFeatures();
    if (choice !== "free" && billingOff()) {
      // Nothing to buy on this server: no sign-up detour, no request bound to fail
      refreshPlanUI();
      toast("Le paiement n'est pas encore activé sur ce serveur.");
      billingBanner.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      billingBanner.focus({ preventScroll: true });
      return;
    }
    if (api.me) await api.me;
    if (!currentUser) {
      if (choice === "free") openAccount("signup", "Crée ton compte gratuit pour lancer ta première analyse.", "studio");
      else openAccount("signup", "Crée ton compte pour t'abonner.", "pricing");
      return;
    }
    if (choice === planKey()) return;
    if (choice === "free") billingRedirect(btn, "/api/billing/portal"); // back to free: cancel in the portal
    else billingRedirect(btn, "/api/billing/checkout", { plan: choice, interval: billingInterval });
  }

  // Checkout or customer portal: the server answers with the Stripe page to send the person to
  async function billingRedirect(btn, endpoint, payload) {
    setBusy(btn, "Redirection…");
    const res = await apiCall("POST", endpoint, payload).catch(() => null);
    const url = res && res.status === 200 && res.data ? safeUrl(res.data.url) : null;
    if (url) {
      if (payload && res.data.portal !== true) session.set(CHECKOUT_KEY, { from: planKey() });
      window.location.assign(url);
      return;
    }
    setIdle(btn);
    refreshPlanUI();
    if (res && res.status === 401) {
      setUser(null);
      openAccount("login", "Ta session a expiré : reconnecte-toi pour continuer.", panelName(openPanel));
      return;
    }
    toast(res ? apiError(res.status, res.data) : MSG_OFFLINE);
  }

  acctManage.addEventListener("click", () => billingRedirect(acctManage, "/api/billing/portal"));

  // Back from Stripe with the browser's back button: the page can come from the cache, busy buttons included
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    $$(".is-loading").forEach((btn) => setIdle(btn));
    refreshPlanUI();
    if (isLive()) loadMe();
  });

  refreshPlanUI();

  /* ---------------- Studio ---------------- */
  const PLATFORMS = [
    { id: "youtube", name: "YouTube", icon: "fa-brands fa-youtube", color: "#ff0033", re: /(?:^|\.)(?:youtube\.com|youtu\.be)$/i },
    { id: "twitch", name: "Twitch", icon: "fa-brands fa-twitch", color: "#9146ff", re: /(?:^|\.)twitch\.tv$/i },
    { id: "tiktok", name: "TikTok", icon: "fa-brands fa-tiktok", color: "#25f4ee", re: /(?:^|\.)tiktok\.com$/i },
    { id: "x", name: "X", icon: "fa-brands fa-x-twitter", color: "#ffffff", re: /(?:^|\.)(?:twitter\.com|x\.com)$/i },
    { id: "kick", name: "Kick", icon: "fa-solid fa-k", color: "#53fc18", re: /(?:^|\.)kick\.com$/i },
    { id: "instagram", name: "Instagram", icon: "fa-brands fa-instagram", color: "#e1306c", re: /(?:^|\.)instagram\.com$/i },
  ];
  const UPLOAD = { id: "upload", name: "Fichier importé", icon: "fa-solid fa-file-video", color: "#ffffff" };
  const platformById = (id) => PLATFORMS.find((p) => p.id === id) || UPLOAD;

  const form = $(".studio-form");
  const urlInput = $(".url-input");
  const platformIcon = $(".platform-icon");
  const urlHint = $(".url-hint");
  const featureHint = $(".feature-hint");
  const ffmpegBanner = $(".ffmpeg-banner");
  const srcLabel = $(".src-label");
  const srcLink = $(".src-link");
  const srcFile = $(".src-file");
  const fileInput = $(".file-input");
  const drop = $(".drop");
  const dropIcon = $(".drop-icon");
  const dropTitle = $(".drop-title");
  const dropSub = $(".drop-sub");
  const errorEl = $(".form-error");
  const range = $(".range");
  const durationOut = $(".duration-out");
  const demoBanner = $(".demo-banner");
  const studioBody = $(".panel-body", panels.studio);
  const progress = $(".progress");
  const progressThumb = $(".progress-thumb");
  const progressSource = $(".progress-source");
  const steps = $$(".steps li");
  const bar = $(".bar");
  const barFill = $(".bar span");
  const progressMsg = $(".progress-msg");
  const cancelBtn = $(".progress-cancel");
  const progressCurve = $(".progress-curve");
  const results = $(".results");
  const resultsTitle = $(".results-title");
  const restartBtn = $(".restart");
  const resultsSource = $(".results-source");
  const resultsCurve = $(".results-curve");
  const warningsEl = $(".warnings");
  const clipsList = $(".clips");
  const clipsEmpty = $(".clips-empty");
  const demoNote = $(".demo-note");

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
  const fmtSize = (bytes) => {
    const units = ["o", "Ko", "Mo", "Go"];
    let n = bytes;
    let u = 0;
    while (n >= 1024 && u < units.length - 1) {
      n /= 1024;
      u++;
    }
    return `${n.toLocaleString("fr-FR", { maximumFractionDigits: u ? 1 : 0 })} ${units[u]}`;
  };
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const clamp01 = (v) => Math.max(0, Math.min(1, num(v)));
  const text = (v) => (typeof v === "string" ? v.trim() : "");

  // DOM builders: server-provided text only ever goes through textContent
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function icon(className) {
    const i = el("i", className);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  // Only http(s) URLs (absolute, or relative to this site) make it into the page
  function safeUrl(raw) {
    if (!text(raw)) return null;
    try {
      const u = new URL(raw, location.href);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch {
      return null;
    }
  }
  const cssUrl = (u) => `url(${JSON.stringify(u)})`;
  const ytThumb = (id) => cssUrl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);

  // Focus moves only while the studio is on screen: a background job must not steal it
  const focusIn = (target) => {
    if (openPanel === panels.studio) target.focus({ preventScroll: true });
  };

  range.addEventListener("input", () => {
    durationOut.textContent = fmtDuration(+range.value);
    range.setAttribute("aria-valuetext", fmtDuration(+range.value));
  });

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

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  /* ---------- Server connection: live analysis, or demo fallback ---------- */
  // What the server can do right now (it may be restarted with ffmpeg or Stripe while the page stays open)
  function applyHealth(data) {
    const live = api.mode === "live";
    api.features = data && data.features && typeof data.features === "object" ? data.features : {};
    api.adminCommand = live && data ? text(data.admin_command).slice(0, 200) : "";
    featureHint.hidden = !(live && api.features.download === false);
    ffmpegBanner.hidden = !(live && api.features.ffmpeg === false);
  }

  // Re-read the features without ever switching to demo mode: a failed request changes nothing
  function refreshFeatures() {
    if (!isLive()) return Promise.resolve();
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 3000);
    return fetch("/api/health", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || data.ok !== true || !isLive()) return;
        applyHealth(data);
        refreshPlanUI();
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }

  function setMode(mode, data) {
    const was = api.mode;
    const isLive = mode === "live";
    api.mode = mode;
    applyHealth(data);
    demoBanner.hidden = mode !== "demo";
    if (!isLive && sourceMode === "file") setSource("link");
    if (isLive && was === "demo" && openPanel === panels.studio) {
      toast("Serveur d'analyse connecté : place aux vrais shorts !");
    }
    if (isLive) loadMe(); // plan & quota of the signed-in account
    refreshPlanUI();
    if (isLive && !activeJob) resumeJob();
  }

  function checkHealth() {
    if (api.checking) return api.checking;
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 3000);
    api.checking = fetch("/api/health", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMode(data && data.ok === true ? "live" : "demo", data))
      .catch(() => setMode("demo"))
      .finally(() => {
        clearTimeout(timer);
        api.checking = null;
      });
    return api.checking;
  }
  const modeReady = () => api.checking || Promise.resolve();

  function onStudioOpen() {
    if (api.mode === "demo") checkHealth();
    else if (api.mode === "live") {
      loadMe();
      if (!activeJob) resumeJob();
    }
  }

  /* ---------- Source: link or video file ---------- */
  let sourceMode = "link";
  let chosenFile = null;

  function setSource(mode) {
    const isFile = mode === "file";
    sourceMode = isFile ? "file" : "link";
    $(`input[name="source"][value="${sourceMode}"]`).checked = true;
    srcLink.hidden = isFile;
    srcFile.hidden = !isFile;
    srcLabel.textContent = isFile ? "Fichier vidéo" : "Lien de la vidéo";
    srcLabel.htmlFor = isFile ? "studio-file" : "studio-url";
    errorEl.hidden = true;
  }

  $$('input[name="source"]').forEach((input) =>
    input.addEventListener("change", async () => {
      if (input.value !== "file") {
        setSource("link");
        return;
      }
      await modeReady();
      if (api.mode === "live") {
        setSource("file");
      } else {
        setSource("link");
        toast("L'import de fichier a besoin du serveur d'analyse : lance-le (voir README) ou colle un lien.");
      }
    })
  );

  const VIDEO_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|flv|wmv|mpe?g|ts|3gp)$/i;

  function pickFile(file) {
    if (!file) return;
    if (!/^video\//.test(file.type) && !VIDEO_EXT.test(file.name)) {
      fileInput.value = "";
      showError("Ce fichier n'est pas une vidéo. Choisis un MP4, MOV, MKV ou WebM.");
      return;
    }
    chosenFile = file;
    errorEl.hidden = true;
    drop.classList.add("has-file");
    dropIcon.className = "fa-solid fa-circle-check drop-icon";
    dropTitle.textContent = file.name;
    dropTitle.title = file.name;
    dropSub.textContent = `${fmtSize(file.size)} · clique pour changer`;
  }

  fileInput.addEventListener("change", () => pickFile(fileInput.files[0]));

  const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
  ["dragenter", "dragover"].forEach((type) =>
    drop.addEventListener(type, (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      drop.classList.add("is-drag");
    })
  );
  drop.addEventListener("dragleave", (e) => {
    if (!drop.contains(e.relatedTarget)) drop.classList.remove("is-drag");
  });
  drop.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    drop.classList.remove("is-drag");
    pickFile(e.dataTransfer.files[0]);
  });
  // A file dropped beside the zone must not make the browser leave the page to open it
  window.addEventListener("dragover", (e) => hasFiles(e) && e.preventDefault());
  window.addEventListener("drop", (e) => hasFiles(e) && e.preventDefault());

  /* ---------- Progress & results views ---------- */
  function setSteps(active, allDone) {
    steps.forEach((li, i) => {
      li.classList.toggle("is-done", allDone || i < active);
      li.classList.toggle("is-active", !allDone && i === active);
    });
  }

  let barValue = 0;
  function setBar(value, keepUp) {
    barValue = keepUp ? Math.max(barValue, clamp01(value)) : clamp01(value);
    barFill.style.width = `${(barValue * 100).toFixed(1)}%`;
    bar.setAttribute("aria-valuenow", String(Math.round(barValue * 100)));
  }

  function setMessage(msg) {
    if (progressMsg.textContent !== msg) progressMsg.textContent = msg;
  }

  function clearBlock(node) {
    node.hidden = true;
    node.textContent = "";
    delete node.dataset.key;
  }

  function resetResults() {
    pauseMedia(clipsList);
    clipsList.textContent = "";
    liveCards.clear();
    resultsTitle.textContent = "Tes shorts sont prêts";
    restartBtn.hidden = false;
    clearBlock(resultsSource);
    clearBlock(resultsCurve);
    clearBlock(warningsEl);
    clipsEmpty.hidden = true;
    demoNote.hidden = true;
  }

  function showProgress(thumbBg) {
    resetResults();
    setSteps(-1, false);
    setBar(0);
    setMessage("");
    progressThumb.style.backgroundImage = thumbBg;
    clearBlock(progressSource);
    clearBlock(progressCurve);
    cancelBtn.hidden = true;
    form.hidden = true;
    results.hidden = true;
    progress.hidden = false;
    focusIn(progress);
  }

  function showForm(message) {
    progress.hidden = true;
    results.hidden = true;
    resetResults();
    form.hidden = false;
    focusIn(sourceMode === "file" ? fileInput : urlInput);
    if (message) {
      showError(message);
      errorEl.scrollIntoView({ block: "nearest" }); // sits under the fold on phones
    }
  }

  function showSourceLine(target, source) {
    const platform = platformById(source.platform);
    const title = text(source.title) || platform.name;
    const length = num(source.duration);
    const key = `${platform.id}|${title}|${length}`;
    if (target.dataset.key === key) return;
    target.dataset.key = key;
    target.textContent = "";
    const logo = icon(`${platform.icon} source-icon`);
    logo.style.color = platform.color;
    const name = el("span", "source-title", title);
    name.title = title;
    target.append(logo, name);
    if (length > 0) target.append(el("span", "source-dur", fmtTime(length)));
  }

  /* ---------- Virality curve ---------- */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SIGNALS = [
    ["audio", "Pics audio"],
    ["scenes", "Changements de plan"],
    ["heatmap", "Moments les plus revus YouTube"],
    ["chat", "Activité du chat"],
    ["transcript", "Transcription"],
    ["llm", "Analyse IA (Claude)"],
    ["faces", "Suivi du visage"],
  ];

  function svgNode(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function drawCurve(slot, points, clips, length, signals) {
    const windows =
      length > 0
        ? clips.map((c, i) => {
            const from = clamp01(num(c.start) / length);
            return { rank: i + 1, from, to: Math.max(from, clamp01(num(c.end) / length)) };
          })
        : [];
    const used = SIGNALS.filter(([k]) => signals[k] === true).map((s) => s[1]);
    const key = JSON.stringify([points, windows, used, length]);
    if (slot.dataset.key === key) return;
    slot.dataset.key = key;

    // Line + low-opacity area, stretched to the box (stroke width stays constant)
    const W = 1000;
    const H = 100;
    const PAD = 4;
    const stepX = W / (points.length - 1);
    const line = points
      .map((v, i) => `${i ? "L" : "M"}${(i * stepX).toFixed(1)},${(H - PAD - v * (H - 2 * PAD)).toFixed(1)}`)
      .join("");
    const svg = svgNode("svg", {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: "none",
      "aria-hidden": "true",
      focusable: "false",
    });
    svg.append(
      svgNode("path", { class: "curve-area", d: `${line}L${W},${H}L0,${H}Z` }),
      svgNode("path", { class: "curve-line", d: line, "vector-effect": "non-scaling-stroke" })
    );

    const plot = el("div", "curve-plot");
    plot.setAttribute("role", "img");
    plot.setAttribute(
      "aria-label",
      windows.length
        ? `Courbe d'intérêt de la vidéo, ${windows.length} passage${windows.length > 1 ? "s" : ""} retenu${windows.length > 1 ? "s" : ""} pour tes shorts`
        : "Courbe d'intérêt de la vidéo"
    );
    windows.forEach((w) => {
      const band = el("span", "curve-band");
      band.style.left = `${(w.from * 100).toFixed(2)}%`;
      band.style.width = `${((w.to - w.from) * 100).toFixed(2)}%`;
      plot.append(band);
    });
    plot.append(svg);

    // Rank numbers sit in a lane above the plot; neighbours that would touch stack on another row
    const lastInRow = [];
    windows
      .slice()
      .sort((a, b) => a.from + a.to - (b.from + b.to))
      .forEach((w) => {
        const center = ((w.from + w.to) / 2) * 100;
        let row = lastInRow.findIndex((x) => center - x >= 4.5);
        if (row === -1) row = lastInRow.length < 3 ? lastInRow.length : 0;
        lastInRow[row] = center;
        const tag = el("span", "curve-rank", String(w.rank));
        tag.style.left = `${center.toFixed(2)}%`;
        tag.style.setProperty("--row", row);
        plot.append(tag);
      });

    const axis = el("div", "curve-axis");
    axis.append(el("span", "", "0:00"), el("span", "", length > 0 ? fmtTime(length) : ""));

    const keys = el("p", "curve-keys");
    const keyLine = el("span", "curve-key");
    keyLine.append(el("span", "key-line"), "Intérêt estimé au fil de la vidéo");
    keys.append(keyLine);
    if (windows.length) {
      const keyBand = el("span", "curve-key");
      keyBand.append(el("span", "key-band"), "Passages retenus");
      keys.append(keyBand);
    }
    const sigs = el("p", "curve-signals");
    sigs.append(el("span", "curve-signals-label", "Signaux utilisés :"));
    used.forEach((label) => sigs.append(el("span", "signal", label)));
    const legend = el("figcaption", "curve-legend");
    legend.append(keys, sigs);

    const fig = el("figure", "curve");
    fig.append(plot, axis, legend);
    slot.textContent = "";
    slot.append(fig);
    slot.hidden = false;
  }

  /* ---------- Demo mode (no server): simulated cuts ---------- */
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
    const thumb = parsed.ytId ? ytThumb(parsed.ytId) : null;
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
        toast("Démo : l'export MP4 a besoin du serveur d'analyse (voir README)")
      );
      clipsList.appendChild(li);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let demoRunning = false;

  async function runAnalysis(parsed, duration, count, opts) {
    demoRunning = true;
    showProgress(parsed.ytId ? ytThumb(parsed.ytId) : GRADIENTS[0]);
    const stepMs = reduceMotion ? 120 : 850;
    for (let i = 0; i < steps.length; i++) {
      setSteps(i, false);
      setBar((i + 1) / steps.length);
      setMessage(`Simulation · ${steps[i].textContent}…`);
      await sleep(stepMs);
    }
    setSteps(steps.length, true);
    renderClips(parsed, buildClips(parsed, duration, count, opts));
    demoNote.hidden = false;
    progress.hidden = true;
    results.hidden = false;
    demoRunning = false;
    focusIn(resultsTitle);
  }

  /* ---------- Live analysis (server API) ---------- */
  const JOB_KEY = "clipzo.job";
  const POLL_MS = 1500;
  const MAX_BACKOFF_MS = 30000;
  const MSG_NETWORK =
    "Impossible de joindre le serveur d'analyse. Vérifie qu'il tourne et que tu es bien connecté, puis réessaie.";
  const MSG_LOST = "Connexion au serveur d'analyse perdue, ton analyse continue de son côté.";
  const MSG_EXPIRED = "Cette analyse a expiré ou n'existe plus sur le serveur. Relance-la.";
  const MSG_FAILED = "L'analyse n'a pas abouti. Réessaie ou tente avec une autre vidéo.";
  const validId = (id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id);
  const liveCards = new Map();

  function apiError(status, data) {
    const detail = data && typeof data.detail === "string" ? data.detail.trim() : "";
    if (detail) return detail;
    if (status === 413) return "Ce fichier est trop lourd pour le serveur. Essaie avec une vidéo plus courte ou plus légère.";
    if (status === 400 || status === 422) {
      return "Le serveur n'a pas accepté ces réglages. Vérifie ta vidéo, la durée et le nombre de shorts, puis réessaie.";
    }
    if (status === 429) return "Le serveur est déjà bien occupé. Attends quelques secondes puis relance l'analyse.";
    if (status >= 500) return "Le serveur d'analyse a rencontré un problème. Réessaie dans un instant.";
    if (status >= 200 && status < 300) return "Réponse inattendue du serveur d'analyse. Réessaie dans un instant.";
    return `Le serveur a refusé la demande (erreur ${status}). Réessaie dans un instant.`;
  }

  // XMLHttpRequest rather than fetch: it reports upload progress
  function send(job, url, payload, onUpload) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      job.xhr = xhr;
      xhr.open("POST", url);
      xhr.setRequestHeader("Accept", "application/json");
      let data = payload;
      if (!(payload instanceof FormData)) {
        xhr.setRequestHeader("Content-Type", "application/json");
        data = JSON.stringify(payload);
      }
      if (onUpload) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && e.total > 0) onUpload(e.loaded / e.total);
        });
      }
      xhr.addEventListener("load", () => {
        job.xhr = null;
        let json = null;
        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          /* not JSON (proxy error page…): the status code says enough */
        }
        resolve({ status: xhr.status, data: json });
      });
      xhr.addEventListener("error", () => reject(new Error("network")));
      xhr.addEventListener("abort", () => reject(new Error("abort")));
      xhr.send(data);
    });
  }

  function newJob(id, ytId, count = 0) {
    return { id, ytId, count, thumb: null, timer: 0, xhr: null, failures: 0, stopped: false };
  }

  const saveJob = (job) => session.set(JOB_KEY, { id: job.id, ytId: job.ytId, count: job.count });

  function stopJob() {
    if (activeJob) {
      activeJob.stopped = true;
      clearTimeout(activeJob.timer);
      if (activeJob.xhr) activeJob.xhr.abort();
      activeJob = null;
    }
    session.remove(JOB_KEY);
  }

  function failJob(message) {
    stopJob();
    showForm(message);
    if (isLive()) loadMe(); // the shorts held by this analysis are free again
    if (openPanel !== panels.studio) toast("L'analyse n'a pas abouti : ouvre le Studio IA pour voir pourquoi.");
  }

  // No (more) session on the server: ask to sign in, then come back to the studio
  function needAccount() {
    const expired = !!currentUser;
    if (expired) authEmail.value = currentUser.email;
    setUser(null);
    if (expired) openAccount("login", "Ta session a expiré : reconnecte-toi pour lancer ton analyse.", "studio");
    else openAccount("signup", "Crée ton compte gratuit pour lancer ta première analyse.", "studio");
  }

  async function startLive({ parsed, file, duration, count, opts }) {
    const job = newJob(null, parsed ? parsed.ytId : null, count);
    activeJob = job;
    showProgress(job.ytId ? ytThumb(job.ytId) : GRADIENTS[0]);
    setSteps(0, false);
    cancelBtn.hidden = false;
    showSourceLine(
      progressSource,
      file
        ? { platform: "upload", title: file.name }
        : { platform: parsed.platform.id, title: parsed.url.href.replace(/^https?:\/\/(www\.)?/i, "") }
    );
    progressSource.hidden = false;
    setMessage(file ? "Envoi du fichier… 0 %" : "Envoi du lien au serveur d'analyse…");

    // "plan" is informative only: the server applies the plan of the signed-in account
    const plan = planKey();
    const settings = { duration, count, plan, options: opts };
    let res;
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file, file.name);
        fd.append("duration", String(duration));
        fd.append("count", String(count));
        fd.append("plan", plan);
        fd.append("options", JSON.stringify(opts));
        res = await send(job, "/api/jobs/upload", fd, (ratio) => {
          if (job.stopped) return;
          setBar(ratio / steps.length, true);
          setMessage(
            ratio < 1 ? `Envoi du fichier… ${Math.floor(ratio * 100)} %` : "Fichier envoyé, le serveur prend le relais…"
          );
        });
      } else {
        res = await send(job, "/api/jobs", { url: parsed.url.href, ...settings });
      }
    } catch {
      if (job.stopped) return; // abandoned by the user
      failJob(MSG_NETWORK);
      checkHealth(); // falls back to demo mode if the server is really gone
      return;
    }
    if (job.stopped) return;
    if (res.status === 401) {
      stopJob();
      showForm();
      needAccount();
      return;
    }
    if (res.status < 200 || res.status >= 300 || !res.data || !validId(res.data.id)) {
      failJob(apiError(res.status, res.data)); // 402: the server's quota message, shown as is
      return;
    }

    // The server took the job and holds its shorts; it charges the ones delivered when the job ends
    job.id = res.data.id;
    saveJob(job);
    loadMe();
    setMessage("Demande acceptée, l'analyse démarre…");
    poll(job);
  }

  function resumeJob() {
    const saved = session.get(JOB_KEY);
    if (activeJob || demoRunning || !saved || !validId(saved.id)) return;
    const ytId = typeof saved.ytId === "string" && /^[\w-]{11}$/.test(saved.ytId) ? saved.ytId : null;
    const count = Number.isInteger(saved.count) ? saved.count : 0;
    const job = newJob(saved.id, ytId, count);
    activeJob = job;
    showProgress(ytId ? ytThumb(ytId) : GRADIENTS[0]);
    cancelBtn.hidden = false;
    setMessage("Reprise du suivi de ton analyse…");
    poll(job);
  }

  async function poll(job) {
    let status = 0;
    let data = null;
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch {
      status = 0; // network error: retried below
    }
    if (job.stopped) return;

    if (status === 200 && data && typeof data === "object") {
      job.failures = 0;
      renderJob(job, data);
      if (data.status === "error" && clipsList.childElementCount > 0) finishJob(text(data.error) || MSG_FAILED);
      else if (data.status === "error") failJob(text(data.error) || MSG_FAILED);
      else if (data.status === "done") finishJob();
      else job.timer = setTimeout(() => poll(job), POLL_MS);
    } else if (status === 404) {
      failJob(text(data && data.detail) || MSG_EXPIRED);
    } else if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      if (status === 401) setUser(null);
      failJob(apiError(status, data));
    } else {
      // Network error, 5xx, 408 or 429: the job keeps running on the server, keep following it
      const wait = Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** Math.min(++job.failures, 5));
      if (job.failures >= 3) setMessage(`${MSG_LOST} Nouvel essai dans ${Math.round(wait / 1000)} s…`);
      job.timer = setTimeout(() => poll(job), wait);
    }
  }

  function renderJob(job, data) {
    const isDone = data.status === "done";
    const queued = data.status === "queued" || data.step === "queued";
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(num(data.step_index))));
    const source = data.source && typeof data.source === "object" ? data.source : null;
    const length = source ? num(source.duration) : 0;
    const clips = Array.isArray(data.clips) ? data.clips.filter((c) => c && typeof c === "object") : [];
    const curve = Array.isArray(data.curve) && data.curve.length > 1 ? data.curve.map(clamp01) : null;
    const signals = data.signals && typeof data.signals === "object" ? data.signals : {};

    setSteps(queued ? -1 : idx, isDone);
    setBar(isDone ? 1 : data.progress, true);
    setMessage(text(data.message) || (queued ? "En file d'attente…" : `${steps[idx].textContent}…`));

    if (source) {
      const thumb = safeUrl(source.thumbnail);
      if (thumb && thumb !== job.thumb) {
        job.thumb = thumb;
        progressThumb.style.backgroundImage = cssUrl(thumb);
      }
      showSourceLine(progressSource, source);
      showSourceLine(resultsSource, source);
      progressSource.hidden = false;
    }
    if (curve) drawCurve(isDone ? resultsCurve : progressCurve, curve, clips, length, signals);
    renderWarnings(data.warnings);
    renderLiveClips(clips);

    // While the cuts are rendered, finished shorts already show up under the progress
    if (!isDone) {
      const n = clipsList.childElementCount;
      results.hidden = n === 0;
      resultsTitle.textContent = `${n} short${n > 1 ? "s" : ""} déjà prêt${n > 1 ? "s" : ""}…`;
      restartBtn.hidden = true;
    }
  }

  function finishJob(interrupted) {
    const n = clipsList.childElementCount;
    const job = activeJob;
    if (job) {
      job.stopped = true;
      clearTimeout(job.timer);
    }
    loadMe(); // the server charged the delivered shorts: show the new quota
    progress.hidden = true;
    cancelBtn.hidden = true;
    results.hidden = false;
    restartBtn.hidden = false;
    resultsTitle.textContent = interrupted
      ? `Analyse interrompue : ${n} short${n > 1 ? "s" : ""} récupéré${n > 1 ? "s" : ""}`
      : n ? "Tes shorts sont prêts" : "Analyse terminée";
    if (interrupted) toast(interrupted);
    resultsSource.hidden = !resultsSource.dataset.key;
    clipsEmpty.hidden = n > 0;
    studioBody.scrollTop = 0;
    focusIn(resultsTitle);
    if (openPanel !== panels.studio) toast("Tes shorts sont prêts : ouvre le Studio IA pour les voir.");
  }

  function renderWarnings(list) {
    const items = Array.isArray(list) ? list.map(text).filter(Boolean) : [];
    const key = JSON.stringify(items);
    if (warningsEl.dataset.key === key) return;
    warningsEl.dataset.key = key;
    warningsEl.textContent = "";
    items.forEach((w) => {
      const li = el("li");
      li.append(icon("fa-solid fa-triangle-exclamation"), el("span", "", w));
      warningsEl.append(li);
    });
    warningsEl.hidden = items.length === 0;
  }

  const clipKey = (c) => (Number.isInteger(c.index) ? `#${c.index}` : `${num(c.start)}-${num(c.end)}`);

  // Clips arrive one by one: add the new ones, keep the server's order, never rebuild a playing video
  function renderLiveClips(clips) {
    let fresh = 0;
    clips.forEach((c, i) => {
      const key = clipKey(c);
      let card = liveCards.get(key);
      if (!card) {
        card = buildLiveClip(c);
        card.style.setProperty("--i", fresh++);
        liveCards.set(key, card);
      }
      setRank(card, i + 1);
      if (clipsList.children[i] !== card) clipsList.insertBefore(card, clipsList.children[i] || null);
    });
    while (clipsList.children.length > clips.length) {
      const extra = clipsList.lastElementChild;
      liveCards.forEach((card, key) => card === extra && liveCards.delete(key));
      extra.remove();
    }
  }

  function buildLiveClip(c) {
    const start = num(c.start);
    const end = Math.max(start, num(c.end));
    const length = num(c.duration) || end - start;
    const score = Math.round(Math.max(0, Math.min(100, num(c.score))));
    const title = text(c.title) || "Moment fort";
    const videoUrl = safeUrl(c.video_url);
    const thumbUrl = safeUrl(c.thumb_url);

    const li = el("li", "clip clip-live");
    const box = el("div", "clip-thumb is-live");
    if (thumbUrl) box.style.backgroundImage = cssUrl(thumbUrl);
    if (videoUrl) {
      const video = el("video", "clip-video");
      video.controls = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "metadata";
      if (thumbUrl) video.poster = thumbUrl;
      video.src = videoUrl;
      video.setAttribute("aria-label", `Aperçu du short : ${title}`);
      // Kept 9:16 when it is; a landscape render is shown whole rather than cropped
      video.addEventListener("loadedmetadata", () =>
        video.classList.toggle("is-landscape", video.videoWidth > video.videoHeight)
      );
      box.append(video);
    }
    box.append(
      el("span", `clip-score${score >= 85 ? " hot" : ""}`, `🔥 ${score}%`),
      el("span", "clip-dur", fmtTime(length))
    );
    li.append(box, el("p", "clip-title", title));

    const meta = el("p", "clip-meta");
    meta.append(el("span", "clip-rank"), ` · ${fmtTime(start)} → ${fmtTime(end)}`);
    li.append(meta);

    const hook = text(c.hook);
    if (hook) {
      const p = el("p", "clip-hook");
      p.append(icon("fa-solid fa-quote-left"), el("span", "", hook));
      li.append(p);
    }

    const tags = (Array.isArray(c.hashtags) ? c.hashtags : [])
      .map(text)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    if (tags.length) li.append(el("p", "clip-tags", tags.join(" ")));

    const reasons = (Array.isArray(c.reasons) ? c.reasons : []).map(text).filter(Boolean).slice(0, 3);
    if (reasons.length) {
      const why = el("div", "clip-why");
      const list = el("ul");
      reasons.forEach((r) => list.append(el("li", "", r)));
      why.append(el("p", "clip-why-title", "Pourquoi ça peut percer"), list);
      li.append(why);
    }

    if (videoUrl) {
      const dl = el("a", "clip-dl");
      dl.href = videoUrl;
      dl.append(icon("fa-solid fa-download"), " Télécharger");
      li.append(dl);
    }
    return li;
  }

  function setRank(card, rank) {
    $(".clip-rank", card).textContent = `#${rank}`;
    const dl = $(".clip-dl", card);
    if (dl) {
      dl.download = `clipzo-short-${rank}.mp4`;
      dl.setAttribute("aria-label", `Télécharger le short n°${rank}`);
    }
  }

  // One preview plays at a time
  clipsList.addEventListener(
    "play",
    (e) => $$("video", clipsList).forEach((v) => v !== e.target && v.pause()),
    true
  );

  /* ---------- Submit ---------- */
  function submitStudio() {
    const fromFile = sourceMode === "file";
    if (fromFile && api.mode !== "live") {
      setSource("link");
      toast("L'import de fichier a besoin du serveur d'analyse : lance-le (voir README) ou colle un lien.");
      return;
    }
    const parsed = fromFile ? null : parseUrl(urlInput.value);
    if (fromFile && !chosenFile) {
      showError("Choisis d'abord ta vidéo : clique sur la zone ou glisse ton fichier dedans.");
      fileInput.focus();
      return;
    }
    if (!fromFile && !parsed) {
      showError("Colle un lien valide YouTube, Twitch, TikTok, X, Kick ou Instagram.");
      urlInput.focus();
      return;
    }
    // Live: an account is needed, and its quota is checked here first (the server has the last word)
    if (isLive() && !currentUser) {
      needAccount();
      return;
    }
    const count = +$('input[name="count"]:checked').value;
    const left = shortsLeft();
    if (left < count) {
      const q = isLive() ? currentUser.quota : { limit: PLANS[demoPlan].quota, reserved: 0 };
      showError(
        left > 0
          ? `Il te reste ${left} short${left > 1 ? "s" : ""} ce mois-ci. Réduis le nombre ou passe à un forfait supérieur.`
          : q.reserved > 0
            ? "Tes shorts restants sont réservés par une analyse en cours. Attends qu'elle se termine ou passe à un forfait supérieur."
            : `Tu as utilisé tes ${q.limit} shorts du mois. Passe à un forfait supérieur pour continuer.`
      );
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
    const duration = +range.value;

    if (api.mode === "live") {
      startLive({ parsed, file: fromFile ? chosenFile : null, duration, count, opts });
      return;
    }
    // Demo: simulated shorts, the real quota is left alone
    runAnalysis(parsed, duration, count, opts);
  }

  let submitting = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    await modeReady(); // the very first health check may still be running
    if (api.me) await api.me; // …and so may the account
    submitting = false;
    submitStudio();
  });

  cancelBtn.addEventListener("click", () => {
    const id = activeJob && activeJob.id;
    if (id) {
      fetch(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST", keepalive: true })
        .catch(() => {})
        .then(() => loadMe()); // its reserved shorts are released
    }
    stopJob();
    showForm();
    toast("Analyse annulée : rien n'a été décompté de ton quota.");
  });

  restartBtn.addEventListener("click", () => {
    stopJob();
    showForm();
    if (sourceMode === "link") urlInput.select();
  });

  /* ---------- Back from Stripe Checkout: /?billing=success | /?billing=cancel ---------- */
  function readBillingReturn() {
    const params = new URLSearchParams(location.search);
    const value = params.get("billing");
    if (value === null) return null;
    params.delete("billing");
    const qs = params.toString();
    try {
      history.replaceState(history.state, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
    } catch {
      /* the address keeps its query string, nothing else depends on it */
    }
    return value;
  }
  const billingReturn = readBillingReturn();

  // Stripe confirms the payment to the server a few seconds later (webhook): follow the plan until it changes
  function watchActivation() {
    const saved = session.get(CHECKOUT_KEY);
    session.remove(CHECKOUT_KEY);
    const from = saved && PLANS[saved.from] ? saved.from : "free";
    let tries = 0;
    toast("Paiement reçu, activation de ton forfait…");
    const check = () =>
      loadMe().then((user) => {
        if (user && user.plan !== from) toast(`Forfait ${user.label} activé`);
        else if (++tries < 10) setTimeout(check, 2000);
        else toast("Paiement reçu : ton forfait sera activé dans quelques instants. Recharge la page si besoin.");
      });
    check();
  }

  setSource("link");
  checkHealth().then(() => {
    if (billingReturn === "success" && isLive()) watchActivation();
    else if (billingReturn === "cancel") {
      session.remove(CHECKOUT_KEY);
      toast("Paiement annulé");
      showPanel("pricing");
    }
    // Reload during an analysis: bring the studio back with the job it was following
    if (activeJob && !openPanel) showPanel("studio");
  });

  /* ---------------- Contact ---------------- */
  $(".contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!e.target.reportValidity()) return;
    e.target.reset();
    hidePanel();
    toast("Démo : ce formulaire n'envoie encore rien (service d'envoi à brancher)");
  });

  // Deep links: #studio, #tarifs, #contact
  const hashMap = { "#studio": "studio", "#tarifs": "pricing", "#contact": "contact" };
  if (hashMap[location.hash]) showPanel(hashMap[location.hash]);
})();
