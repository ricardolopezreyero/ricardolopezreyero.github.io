/* RLR · Talento · ficha compartida (solo lectura) · Ricardo López Reyero · rev 181218 */
(() => {
  const _RLR = "Ricardo López Reyero";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fecha = (iso) => { if (!iso) return "—"; const t = new Date(/Z$/.test(iso) ? iso : iso + "Z"); return `${t.getUTCDate()} ${MESES[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
  const tel = (t) => (t && t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t || "—");
  const primer = (n) => String(n || "").split(" ").find((w) => w.length > 2) || n;
  const ICONO_WA = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.2Z"/></svg>`;
  const V = { A: "La recomendamos", B: "Buena opción", C: "Con reservas", D: "No la recomendamos", P: "Por evaluar" };
  const MED = {
    domestica: [["Seriedad", "p_seriedad", 25], ["Experiencia", "p_exp", 20], ["Limpieza", "p_limpieza", 20], ["Armonía", "p_armonia", 20], ["Cocina", "p_cocina", 10]],
    guia: [["Experiencia", "p_exp", 25], ["Pedagogía", "p_limpieza", 20], ["Calma", "p_armonia", 20], ["Confianza", "p_cocina", 15], ["Seriedad", "p_seriedad", 15]],
  };
  const cita = (t, x) => `<div class="cita-titulo">${t}</div><blockquote class="cita"><p>«${esc(x || "—")}»</p></blockquote>`;

  function pintar(c, expira) {
    const guia = c.puesto === "guia";
    const e = (c.envios_detalle || [])[c.destacado ?? -1] || (c.envios_detalle || []).slice(-1)[0] || c;
    const msg = `Hola ${primer(c.nombre)}, buen día. Le escribo por la solicitud que llenó para trabajar en casa. ¿Sigue disponible?`;
    const wa = c.contratada
      ? `<span class="btn btn-verde btn-apagado">${ICONO_WA}Ya fue contratada</span>`
      : `<a class="btn btn-verde" href="https://wa.me/52${c.celular}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ICONO_WA}WhatsApp ${tel(c.celular)}</a>`;
    $("#ficha").innerHTML = `
    <div class="fc-hero"><div class="fc-hero-in">
      <div class="fc-nav"><span class="eyebrow">Talento · ficha compartida</span><span class="fc-pos">Vence el ${fecha(expira)}</span></div>
      <div class="fc-top">
        <div>
          <div class="fc-lugar"><span class="veredicto v-${c.nivel}">${V[c.nivel] || ""}</span><span class="insignia fuerte">${guia ? "Guía" : "Empleado doméstico"}</span></div>
          <h1>${esc(c.nombre)}</h1>
          <div class="fc-meta">${c.edad ? `<span>${c.edad} años</span>` : ""}${c.colonia ? `<span>${esc(c.colonia)}</span>` : ""}${!guia && c.experiencia ? `<span>${esc(c.experiencia)} en casas</span>` : ""}</div>
          <div class="fc-contacto">${wa}</div>
        </div>
        <div class="fc-marcador">
          <div class="fc-marcador-cab"><span>Calificación</span><div class="puntaje-num tab">${c.puntos ?? "—"}<small>/100</small></div></div>
          <div class="medidores">${(MED[c.puesto] || MED.domestica).map(([n, k, max]) => `<div class="medidor"><span class="m-nombre">${n}</span><span class="m-barra"><i data-w="${Math.round(((c[k] || 0) / max) * 100)}"></i></span><span class="m-num">${c[k] ?? 0}/${max}</span></div>`).join("")}</div>
        </div>
      </div>
    </div></div>
    <div class="fc-cuerpo compartida-cuerpo"><div class="fc-col">
      <section class="panel"><h2>Nuestra lectura</h2>
        <p class="lectura-lead">${esc(c.resumen || "—")}</p>
        <div class="dos"><div class="caja caja-bien"><h3>Lo que la hace brillar</h3><p>${esc(c.a_favor || "—")}</p></div>
        <div class="caja caja-ojo"><h3>Lo que hay que confirmar</h3><p>${esc(c.a_cuidar || "—")}</p></div></div>
        ${c.preguntar ? `<div class="pregunta"><span></span><div><b>Pregunta para la primera llamada</b><p>${esc(c.preguntar)}</p></div></div>` : ""}
      </section>
      <section class="panel"><h2>En sus palabras</h2><p class="sub">Lo que ella escribió en su solicitud, tal cual.</p>
        ${guia ? cita("Una experiencia real con niños pequeños", e.exp_ninos) + cita("Si la niña se frustra o llora", e.frustracion) + cita("Cómo organizaría una tarde de 4 horas", e.tarde) + cita("Qué es ser confiable dentro de un hogar", e.confianza)
               : cita("Por qué cree que es la mejor para el puesto", e.porque) + cita("Lo primero que limpia al llegar, y por qué", e.limpia) + cita("Lo que cocina muy bien", e.comidas)}
      </section>
      <p class="pie-compartida">Este enlace muestra solo esta ficha y vence el ${fecha(expira)}.</p>
    </div></div>`;
    document.querySelectorAll("[data-w]").forEach((i) => { i.style.width = `${i.dataset.w}%`; });
    document.title = `${c.nombre} · Talento`;
  }

  const API = location.hostname.endsWith("github.io") ? "https://talento.noisy-shape-4fc9.workers.dev" : "";
  const token = location.hash.replace(/^#/, "") || location.pathname.split("/").pop();
  fetch(`${API}/api/compartida/${encodeURIComponent(token)}`).then((r) => r.json().then((d) => [r.ok, d])).then(([ok, d]) => {
    if (!ok) throw new Error("vencido");
    pintar(d.candidata, d.expira);
  }).catch(() => {
    $("#ficha").innerHTML = `<div class="fc-hero"><div class="fc-hero-in"><div class="eyebrow">Talento</div><h1 class="cmp-h1">Este enlace ya no está disponible</h1><p class="hero-sub">Pídele a quien te lo mandó que te comparta uno nuevo.</p></div></div>`;
  });
})();
