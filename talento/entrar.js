/* RLR · entrada con PIN + Turnstile · Ricardo López Reyero · rev 181218 */
(() => {
  const _RLR = "Ricardo López Reyero";
  // RLR · la pantalla puede vivir en GitHub Pages o en el Worker; la API siempre está en el Worker
  const EN_PAGES = location.hostname.endsWith("github.io");
  const API = EN_PAGES ? "https://talento.noisy-shape-4fc9.workers.dev" : "";
  const INICIO = EN_PAGES ? "./" : "/";
  const ENTRADA = EN_PAGES ? "entrar.html" : "/";
  const leerLlave = () => { try { return localStorage.getItem("talento-llave") || ""; } catch { return ""; } };
  const ponerLlave = (v) => { try { v ? localStorage.setItem("talento-llave", v) : localStorage.removeItem("talento-llave"); } catch { /* sin almacenamiento */ } };
  let pin = "", token = "", widget = null, sitekey = null, enviando = false;
  const $ = (id) => document.getElementById(id);
  const puntos = $("puntos"), msg = $("mensaje");

  function pinta() {
    [...puntos.children].forEach((s, i) => s.classList.toggle("lleno", i < pin.length));
  }
  function aviso(t, bien) {
    msg.textContent = t || "";
    msg.classList.toggle("bien", !!bien);
  }
  function tecla(n) {
    if (enviando || pin.length >= 4) return;
    pin += n; pinta(); aviso("");
    if (pin.length === 4) setTimeout(entrar, 120);
  }
  function borrar() { pin = pin.slice(0, -1); pinta(); }

  async function entrar() {
    if (pin.length !== 4 || enviando) return;
    if (sitekey && !token) { aviso("Espera a que Cloudflare confirme que eres una persona."); return; }
    enviando = true; aviso("Entrando…", true);
    try {
      const r = await fetch(API + "/api/entrar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, token }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { ponerLlave(d.llave || ""); aviso("Listo", true); location.replace(INICIO); return; }
      puntos.classList.remove("error"); void puntos.offsetWidth; puntos.classList.add("error");
      let t = d.mensaje || "No se pudo entrar.";
      if (d.error === "pin" && typeof d.quedan === "number") t += d.quedan > 0 ? ` Te quedan ${d.quedan} intentos.` : " Espera 15 minutos.";
      aviso(t);
    } catch {
      aviso("Sin conexión. Intenta de nuevo.");
    }
    pin = ""; pinta(); enviando = false;
    if (widget !== null && window.turnstile) { token = ""; window.turnstile.reset(widget); }
  }

  $("teclado").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.n) tecla(b.dataset.n);
    else if (b.dataset.a === "borrar") borrar();
    else if (b.dataset.a === "entrar") entrar();
  });
  document.addEventListener("keydown", (e) => {
    if (/^\d$/.test(e.key)) tecla(e.key);
    else if (e.key === "Backspace") borrar();
    else if (e.key === "Enter") entrar();
  });

  // Turnstile solo si el servidor ya lo tiene configurado
  window.alCargarTurnstile = () => {
    widget = window.turnstile.render("#caja-humano", {
      sitekey, action: "entrar", theme: "dark", language: "es",
      callback: (t) => { token = t; if (pin.length === 4) entrar(); },
      "expired-callback": () => { token = ""; },
      "error-callback": (codigo) => {
        token = "";
        // 110200 = este dominio aún no está autorizado en Turnstile: se entra por el Worker para no dejar a nadie fuera
        if (EN_PAGES && String(codigo).startsWith("1102")) { location.replace("https://talento.noisy-shape-4fc9.workers.dev/"); return true; }
        aviso("Cloudflare no pudo verificar. Recarga la página.");
      },
    });
  };
  fetch(API + "/api/config").then((r) => r.json()).then((c) => {
    sitekey = c.turnstile;
    if (!sitekey) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=alCargarTurnstile";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }).catch(() => {});
})();
