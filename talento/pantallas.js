/* ─────────────────────────────────────────────────────────────
 *  RLR · Talento · pantallas del proceso: embudo, analítica, puestos, mensajes, cómo las ordené, entradas
 *  Autor: Ricardo López Reyero · build eye · rev 181218
 * ───────────────────────────────────────────────────────────── */
(() => {
  const _RLR = "Ricardo López Reyero", _k = "EYE", _rev = 181218;
  const T = window.Talento;
  const { st, $, $$, esc, fecha, dias, tel, primer, api, aviso, guardarMarca, repintar, anchos, waBoton, veredicto, ETAPAS, ETAPA_NOMBRE, nombreDe, ir, marcaDe, etapaDe, ICONO_WA, medidoresDe, nombreFormulario } = T;

  const activas = () => (st.puesto === "*" ? st.todas : st.todas.filter((c) => c.puesto === st.puesto));
  const puestoActual = () => (st.puesto === "*" ? null : T.P());
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const n0 = (x) => (x == null || Number.isNaN(x) ? "—" : String(x));

  /* ═══ EMBUDO ═══ */
  function embudo(v) {
    const cs = activas();
    const porEtapa = Object.fromEntries(ETAPAS.map(([k]) => [k, []]));
    const descartadas = [];
    for (const c of cs) {
      const e = etapaDe(c);
      if (e === "descartada") descartadas.push(c);
      else (porEtapa[e] || porEtapa[""]).push(c);
    }
    const orden = (a, b) => (b.puntos || 0) - (a.puntos || 0) || String(b.ultimo_envio).localeCompare(String(a.ultimo_envio));
    for (const k of Object.keys(porEtapa)) porEtapa[k].sort(orden);
    const llegaron = (k) => { const i = ETAPAS.findIndex(([x]) => x === k); return ETAPAS.slice(i).reduce((a, [x]) => a + porEtapa[x].length, 0); };
    const total = cs.length;
    const p = puestoActual();
    v.innerHTML = `
      ${T.selectorPuestos(true)}
      <section class="cab"><div><div class="eyebrow">Proceso de reclutamiento</div><h1>Embudo ${p ? `· <em>${esc(p.nombre)}</em>` : "de <em>todos los puestos</em>"}</h1><p class="sub">Arrastra una tarjeta a otra columna o usa las flechas. Cada paso queda escrito para la analítica.</p></div></section>
      <div class="embudo-resumen">${ETAPAS.map(([k, t], i) => {
        const n = k === "" ? total - descartadas.length : llegaron(k);
        const prev = i ? llegaron(ETAPAS[i - 1][0]) : 0; if (i === 1) { /* contactadas vs total */ }
        const base = i === 0 ? 0 : (i === 1 ? total - descartadas.length : llegaron(ETAPAS[i - 1][0]));
        return `<div class="embudo-paso"><div class="n tab">${n}</div><div class="l">${k === "" ? "Llegaron" : `Llegaron a ${t.toLowerCase()}`}</div>${i ? `<span class="tasa" title="De las que llegaron al paso anterior">${pct(n, base)} %</span>` : ""}<div class="barra"><i data-w="${pct(n, total - descartadas.length || 1)}"></i></div></div>`;
      }).join("")}</div>
      <div class="kanban ancho-datos" id="kanban">${ETAPAS.map(([k, t]) => columna(k, t, porEtapa[k])).join("")}
        <div class="kcol descartadas" data-etapa="descartada"><div class="kcol-cab"><h3>Descartadas</h3><b>${descartadas.length}</b></div>
          ${descartadas.length ? `<details><summary class="k-vacio">Ver las ${descartadas.length} descartadas</summary><div class="kcards">${descartadas.sort(orden).map((c) => kcard(c, "descartada")).join("")}</div></details>` : `<div class="k-vacio">Ninguna descartada</div>`}
        </div>
      </div>`;
    anchos(v);
    arrastrar(v);
  }
  const LIMITE_COL = 40;
  function columna(k, t, lista) {
    const vis = lista.slice(0, LIMITE_COL);
    return `<div class="kcol" data-etapa="${k}"><div class="kcol-cab"><h3>${t}</h3><b>${lista.length}</b></div>
      <div class="kcards">${vis.map((c) => kcard(c, k)).join("") || `<div class="k-vacio">${k === "" ? "Sin candidatas nuevas" : "Arrastra aquí"}</div>`}
      ${lista.length > LIMITE_COL ? `<div class="k-vacio">y ${lista.length - LIMITE_COL} más · búscalas en Candidatas</div>` : ""}</div></div>`;
  }
  function kcard(c, etapa) {
    const i = ETAPAS.findIndex(([k]) => k === etapa);
    const m = marcaDe(c);
    const desde = m.cuando && etapa ? dias(m.cuando) : dias(c.ultimo_envio);
    const p = T.PC(c);
    return `<article class="kcard ${etapa === "contratada" ? "contratada" : ""}" draggable="true" data-id="${c.id}" data-etapa="${etapa}">
      <div class="k-cab"><span class="avatar chico n${c.nivel}">${esc(T.iniciales(c.nombre))}</span><span class="k-nombre">${m.favorita ? "★ " : ""}${T.nombreHTML(c.nombre)}${T.etiquetasHTML(c, true)}</span><span class="k-puntos tab">${c.puntos ?? "—"}</span></div>
      <div class="k-meta">${st.puesto === "*" ? `<span class="insignia">${esc(p.corto || p.nombre)}</span>` : ""}<span class="veredicto v-${c.nivel}">${veredicto(c).corto}</span><span>${desde == null ? "" : desde < 1 ? "hoy" : `${desde} d${etapa ? " en esta etapa" : " desde que llenó"}`}</span></div>
      <div class="k-acciones">${waBoton(c, "btn-verde", ICONO_WA)}<button class="btn btn-fantasma" data-abrir="${c.id}">Ficha</button>
        <span class="k-mover">${etapa === "descartada" ? `<button type="button" data-mover="${c.id}" data-a="" title="Regresar a nuevas">↩</button>` : `<button type="button" data-mover="${c.id}" data-a="${i > 0 ? ETAPAS[i - 1][0] : ""}" ${i <= 0 ? "disabled" : ""} title="Regresar">←</button><button type="button" data-mover="${c.id}" data-a="${i < ETAPAS.length - 1 ? ETAPAS[i + 1][0] : ""}" ${i >= ETAPAS.length - 1 ? "disabled" : ""} title="Avanzar">→</button><button type="button" data-mover="${c.id}" data-a="descartada" title="Descartar">✕</button>`}</span></div>
    </article>`;
  }
  async function mover(id, a) {
    const c = st.porId[id]; if (!c) return;
    if (a === "contratada") { const b = $(`.kcard[data-id="${id}"] [data-a="contratada"]`); const r = b ? b.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 }; T.$("#contratar-nombre").textContent = c.nombre; T.$("#contratar-puesto").textContent = T.PC(c).nombre.toLowerCase(); T.$("#btn-si-contratar").textContent = `Sí, contratar a ${primer(c.nombre)}`; T.$("#dlg-contratar").showModal(); T.$("#btn-si-contratar").onclick = null; porContratarEmbudo = { id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; return; }
    try { await guardarMarca(id, { estado: a }); aviso(a ? `${primer(c.nombre)} → ${ETAPA_NOMBRE[a]}` : `${primer(c.nombre)} regresa a nuevas`); repintar(); }
    catch { aviso("No se guardó. Revisa tu conexión."); }
  }
  let porContratarEmbudo = null;
  function arrastrar(v) {
    let idArr = null;
    v.addEventListener("dragstart", (e) => { const k = e.target.closest(".kcard"); if (!k) return; idArr = k.dataset.id; k.classList.add("arrastrando"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", idArr); } catch {} });
    v.addEventListener("dragend", (e) => { const k = e.target.closest(".kcard"); if (k) k.classList.remove("arrastrando"); $$(".kcol.sobre", v).forEach((x) => x.classList.remove("sobre")); });
    v.addEventListener("dragover", (e) => { const col = e.target.closest(".kcol"); if (!col) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; $$(".kcol.sobre", v).forEach((x) => x.classList.remove("sobre")); col.classList.add("sobre"); });
    v.addEventListener("dragleave", (e) => { const col = e.target.closest(".kcol"); if (col && !col.contains(e.relatedTarget)) col.classList.remove("sobre"); });
    v.addEventListener("drop", (e) => { const col = e.target.closest(".kcol"); if (!col) return; e.preventDefault(); col.classList.remove("sobre"); const id = idArr || e.dataTransfer.getData("text/plain"); const c = st.porId[id]; if (!c) return; const a = col.dataset.etapa; if (etapaDe(c) === a) return; mover(id, a); });
  }

  /* ═══ ANALÍTICA ═══ */
  const COLORES = ["", "c2", "c3", "c4"]; // clases por puesto en orden fijo
  const colorDe = (pid) => { const i = st.puestos.findIndex((p) => p.id === pid); return i < 0 || i > 3 ? "neutro" : COLORES[i]; };
  function semanaDe(iso) { const d = new Date(iso.slice(0, 10) + "T12:00:00"); const dia = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dia); return d; }
  const claveSemana = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function analitica(v) {
    const cs = activas();
    const p = puestoActual();
    const ahora = Date.now();
    const llegadas = (d) => cs.filter((c) => c.primer_envio && ahora - new Date(c.primer_envio.slice(0, 19)) <= d * 86400000).length;
    const evaluadas = cs.filter((c) => c.nivel !== "P");
    const etapa = (k) => cs.filter((c) => etapaDe(c) === k).length;
    const contactadas = cs.filter((c) => ["contactada", "entrevista", "prueba", "contratada"].includes(etapaDe(c))).length;
    const entrevistas = cs.filter((c) => ["entrevista", "prueba", "contratada"].includes(etapaDe(c))).length;
    const contratadas = etapa("contratada");
    // días de llegada a contacto: primer evento 'contactada' (o posterior) menos primer envío
    const aContacto = [];
    for (const c of cs) {
      const ev = st.eventos.filter((e) => e.id === c.id && ["contactada", "entrevista", "prueba", "contratada"].includes(e.a)).sort((a, b) => a.cuando.localeCompare(b.cuando))[0];
      if (ev && c.primer_envio) aContacto.push((new Date(ev.cuando) - new Date(c.primer_envio.slice(0, 19))) / 86400000);
    }
    const prom = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const sinRespuesta = cs.filter((c) => c.nivel === "A" && !etapaDe(c)).length;

    // Llegadas por semana (últimas 12), apiladas por puesto. Cuenta cada envío (una persona que llena dos veces son dos llegadas).
    const semanas = []; const ini = semanaDe(new Date().toISOString()); ini.setDate(ini.getDate() - 7 * 11);
    for (let i = 0; i < 12; i++) { const d = new Date(ini); d.setDate(d.getDate() + 7 * i); semanas.push({ clave: claveSemana(d), fecha: d, por: {}, total: 0 }); }
    const idx = Object.fromEntries(semanas.map((s, i) => [s.clave, i]));
    for (const c of cs) for (const e of c.envios_detalle || [{ fecha: c.primer_envio }]) {
      if (!e.fecha) continue; const k = claveSemana(semanaDe(e.fecha)); const i = idx[k]; if (i == null) continue;
      semanas[i].por[c.puesto] = (semanas[i].por[c.puesto] || 0) + 1; semanas[i].total++;
    }
    const puestosEnSemanas = st.puestos.filter((q) => semanas.some((s) => s.por[q.id]));

    const cuenta = (f) => { const m = {}; for (const c of cs) { const k = f(c); if (k) m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const niveles = [["A", "Llamar primero"], ["B", "Buena opción"], ["C", "Con reservas"], ["D", "No recomendada"], ["P", "Por evaluar"]].map(([k, t]) => [t, cs.filter((c) => (c.nivel || "P") === k).length]);
    const colonias = cuenta((c) => (c.colonia || "").trim().replace(/\s+/g, " ").replace(/^(col\.?|colonia|fracc\.?|fraccionamiento)\s+/i, "").split(",")[0].slice(0, 40)).slice(0, 8);
    const experiencia = cuenta((c) => (c.experiencia && c.experiencia.length < 30 ? c.experiencia : "")).sort((a, b) => ordenExp(a[0]) - ordenExp(b[0]));
    const formularios = cuenta((c) => nombreFormulario(c));
    const referidos = cuenta((c) => { const r = (c.referido || "").trim(); return !r || /^(no|ninguno|nadie|-|n\/a|na|internet|facebook|fb|anuncio)$/i.test(r) ? (r ? "Anuncio / internet" : "Sin dato") : "Referida por alguien"; });
    const edades = cuenta((c) => (c.edad ? (c.edad < 25 ? "Menos de 25" : c.edad < 35 ? "25 a 34" : c.edad < 45 ? "35 a 44" : c.edad < 55 ? "45 a 54" : "55 o más") : "")).sort((a, b) => ordenEdad(a[0]) - ordenEdad(b[0]));
    const repetidas = cs.filter((c) => c.envios > 1).length;
    const puntosProm = prom(evaluadas.map((c) => c.puntos || 0));
    const embudoHB = [["Llegaron", cs.length], ["Evaluadas", evaluadas.length], ["Contactadas", contactadas], ["Entrevista", entrevistas], ["Prueba", cs.filter((c) => ["prueba", "contratada"].includes(etapaDe(c))).length], ["Contratadas", contratadas]];
    const porPuesto = st.puesto === "*" ? st.puestos.map((q) => { const l = st.todas.filter((c) => c.puesto === q.id); return { nombre: q.nombre, color: colorDe(q.id), total: l.length, a: l.filter((c) => c.nivel === "A").length, contactadas: l.filter((c) => ["contactada", "entrevista", "prueba", "contratada"].includes(etapaDe(c))).length, contratadas: l.filter((c) => etapaDe(c) === "contratada").length }; }).filter((x) => x.total) : [];

    v.innerHTML = `
      ${T.selectorPuestos(true)}
      <section class="cab"><div><div class="eyebrow">Analítica</div><h1>Cómo va ${p ? `<em>${esc(p.nombre)}</em>` : "<em>el reclutamiento</em>"}</h1><p class="sub">Lo que llega, lo que vale la pena y qué tan rápido lo mueven.</p></div></section>
      <div class="stats">
        <div class="stat"><div class="n tab">${cs.length}</div><div class="l">Candidatas en total</div></div>
        <div class="stat"><div class="n tab">${llegadas(7)}<small> · ${llegadas(30)} en 30 d</small></div><div class="l">Llegaron esta semana</div></div>
        <div class="stat"><div class="n tab">${evaluadas.filter((c) => c.nivel === "A").length}</div><div class="l">Para llamar primero</div></div>
        <div class="stat ${sinRespuesta ? "alerta" : ""}"><div class="n tab">${sinRespuesta}</div><div class="l">Buenas sin contactar</div></div>
        <div class="stat"><div class="n tab">${pct(contactadas, evaluadas.length)}<small> %</small></div><div class="l">Contactadas de las evaluadas</div></div>
        <div class="stat"><div class="n tab">${pct(entrevistas, contactadas)}<small> %</small></div><div class="l">Pasan a entrevista</div></div>
        <div class="stat"><div class="n tab">${n0(prom(aContacto))}<small> d</small></div><div class="l">De que llena a que la contactan</div></div>
        <div class="stat"><div class="n tab">${contratadas}</div><div class="l">Contratadas</div></div>
      </div>
      <div class="graficas">
        <div class="grafica ancha"><h3>Llegadas por semana</h3><p class="g-sub">Solicitudes recibidas en las últimas 12 semanas${puestosEnSemanas.length > 1 ? ", por puesto" : ""}.</p>${barrasSemanas(semanas, puestosEnSemanas)}</div>
        <div class="grafica"><h3>Embudo</h3><p class="g-sub">Cuántas llegan a cada paso.</p>${hbars(embudoHB, cs.length)}</div>
        <div class="grafica"><h3>Calidad de lo que llega</h3><p class="g-sub">Promedio ${n0(puntosProm)} puntos · ${repetidas} llenaron más de una vez.</p>${hbars(niveles, cs.length)}</div>
        ${porPuesto.length ? `<div class="grafica ancha"><h3>Por puesto</h3><p class="g-sub">Cuántas llegan, cuántas valen la llamada y cuántas ya contactaron.</p>${tablaPuestos(porPuesto)}</div>` : ""}
        <div class="grafica"><h3>De dónde vienen</h3><p class="g-sub">Colonias más frecuentes.</p>${hbars(colonias, cs.length)}</div>
        ${experiencia.length > 1 ? `<div class="grafica"><h3>Experiencia</h3><p class="g-sub">Lo que contestaron.</p>${hbars(experiencia, cs.length)}</div>` : ""}
        <div class="grafica"><h3>Edades</h3><p class="g-sub">${cs.filter((c) => c.edad).length} dieron su fecha de nacimiento.</p>${hbars(edades, cs.length)}</div>
        <div class="grafica"><h3>Por formulario</h3><p class="g-sub">Qué anuncio o formulario las trajo.</p>${hbars(formularios, cs.length)}</div>
        <div class="grafica"><h3>Referidas</h3><p class="g-sub">Si alguien las recomendó.</p>${hbars(referidos, cs.length)}</div>
        <div class="grafica"><h3>Ritmo del proceso</h3><p class="g-sub">Días promedio entre pasos, con la historia de la casa.</p>${hbars(ritmo(cs), null, true)}</div>
      </div>`;
    anchos(v);
    tooltips(v);
  }
  const ordenExp = (s) => ({ "Menos de 1 año": 0, "De 1 a 2 años": 1, "De 2 a 5 años": 2, "Más de 5 años": 3 }[s] ?? 9);
  const ordenEdad = (s) => ["Menos de 25", "25 a 34", "35 a 44", "45 a 54", "55 o más"].indexOf(s);
  function ritmo(cs) {
    const pasos = [["", "contactada", "Llega → contactada"], ["contactada", "entrevista", "Contactada → entrevista"], ["entrevista", "prueba", "Entrevista → prueba"], ["prueba", "contratada", "Prueba → contratada"], ["entrevista", "contratada", "Entrevista → contratada"]];
    const ids = new Set(cs.map((c) => c.id));
    const out = [];
    for (const [de, a, t] of pasos) {
      const xs = [];
      for (const c of cs) {
        const evs = st.eventos.filter((e) => e.id === c.id).sort((x, y) => x.cuando.localeCompare(y.cuando));
        const fin = evs.find((e) => e.a === a); if (!fin) continue;
        const ini = de === "" ? (c.primer_envio ? { cuando: c.primer_envio.slice(0, 19) } : null) : evs.find((e) => e.a === de);
        if (!ini) continue;
        const d = (new Date(fin.cuando) - new Date(ini.cuando)) / 86400000;
        if (d >= 0 && d < 365) xs.push(d);
      }
      if (xs.length) out.push([`${t} (${xs.length})`, Math.round(xs.reduce((p, q) => p + q, 0) / xs.length)]);
    }
    return out.length ? out : [["Todavía no hay pasos registrados", 0]];
  }
  function hbars(filas, total, enDias) {
    if (!filas.length) return `<div class="k-vacio">Sin datos</div>`;
    const max = Math.max(...filas.map((f) => f[1]), 1);
    return `<div class="hbars">${filas.map(([n, v], i) => `<div class="hbar" data-tip="${esc(n)}: ${v}${enDias ? " días" : total ? ` (${pct(v, total)} %)` : ""}"><span class="hb-n" title="${esc(n)}">${esc(n)}</span><span class="hb-b"><i class="${enDias ? "c2" : i ? "" : ""}" data-w="${Math.round((v / max) * 100)}"></i></span><span class="hb-v tab">${v}${enDias ? " d" : ""}</span></div>`).join("")}</div>
      <details><summary>Ver como tabla</summary><table><tr><th>Concepto</th><th class="derecha">${enDias ? "Días" : "Cuántas"}</th>${total ? `<th class="derecha">%</th>` : ""}</tr>${filas.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="derecha">${v}</td>${total ? `<td class="derecha">${pct(v, total)} %</td>` : ""}</tr>`).join("")}</table></details>`;
  }
  function barrasSemanas(semanas, puestos) {
    const W = 760, H = 220, pad = { l: 30, r: 8, t: 10, b: 28 };
    const max = Math.max(...semanas.map((s) => s.total), 1);
    const ancho = (W - pad.l - pad.r) / semanas.length;
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    const ejes = [0, Math.ceil(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
    const barras = semanas.map((s, i) => {
      let acum = 0; const x = pad.l + i * ancho + ancho * .18, w = ancho * .64;
      const partes = (puestos.length ? puestos : [{ id: "__" }]).map((p) => {
        const v = puestos.length ? (s.por[p.id] || 0) : s.total; if (!v) return "";
        const y1 = y(acum + v), h = Math.max(0, y(acum) - y1 - (acum ? 2 : 0)); acum += v;
        return `<rect class="g-barra ${puestos.length ? colorDe(p.id) : ""}" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
      }).join("");
      const etq = `${s.fecha.getDate()} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][s.fecha.getMonth()]}`;
      const tip = `Semana del ${etq}: ${s.total}${puestos.length > 1 ? " · " + puestos.map((p) => `${p.corto || p.nombre} ${s.por[p.id] || 0}`).join(" · ") : ""}`;
      return `<g data-tip="${esc(tip)}"><rect x="${(pad.l + i * ancho).toFixed(1)}" y="${pad.t}" width="${ancho.toFixed(1)}" height="${H - pad.t - pad.b}" fill="transparent"/>${partes}${s.total ? `<text class="g-valor" x="${(x + w / 2).toFixed(1)}" y="${(y(s.total) - 4).toFixed(1)}" text-anchor="middle">${s.total}</text>` : ""}<text class="g-eje" x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${etq}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Llegadas por semana">${ejes.map((v) => `<line class="g-linea" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="g-eje" x="${pad.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join("")}${barras}</svg>
      ${puestos.length > 1 ? `<div class="g-leyenda">${puestos.map((p) => `<span><i class="${colorDe(p.id)}"></i>${esc(p.nombre)}</span>`).join("")}</div>` : ""}
      <details><summary>Ver como tabla</summary><table><tr><th>Semana</th>${puestos.length > 1 ? puestos.map((p) => `<th class="derecha">${esc(p.corto || p.nombre)}</th>`).join("") : ""}<th class="derecha">Total</th></tr>${semanas.map((s) => `<tr><td>${fecha(s.clave)}</td>${puestos.length > 1 ? puestos.map((p) => `<td class="derecha">${s.por[p.id] || 0}</td>`).join("") : ""}<td class="derecha">${s.total}</td></tr>`).join("")}</table></details>`;
  }
  function tablaPuestos(filas) {
    const max = Math.max(...filas.map((f) => f.total), 1);
    return `<div class="hbars">${filas.map((f) => `<div class="hbar" data-tip="${esc(f.nombre)}: ${f.total} candidatas · ${f.a} para llamar · ${f.contactadas} contactadas · ${f.contratadas} contratadas"><span class="hb-n">${esc(f.nombre)}</span><span class="hb-b"><i class="${f.color}" data-w="${Math.round((f.total / max) * 100)}"></i></span><span class="hb-v tab">${f.total}</span></div>`).join("")}</div>
      <details open><summary>Ver como tabla</summary><table><tr><th>Puesto</th><th class="derecha">Llegaron</th><th class="derecha">Llamar primero</th><th class="derecha">Contactadas</th><th class="derecha">Contratadas</th></tr>${filas.map((f) => `<tr><td>${esc(f.nombre)}</td><td class="derecha">${f.total}</td><td class="derecha">${f.a}</td><td class="derecha">${f.contactadas} (${pct(f.contactadas, f.total)} %)</td><td class="derecha">${f.contratadas}</td></tr>`).join("")}</table></details>`;
  }
  function tooltips(v) {
    const tip = $("#g-tip");
    v.addEventListener("mousemove", (e) => {
      const el = e.target.closest("[data-tip]");
      if (!el) { tip.classList.remove("ver"); return; }
      tip.textContent = el.dataset.tip; tip.classList.add("ver");
      const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8), y = e.clientY + 16;
      tip.style.left = `${x}px`; tip.style.top = `${y}px`;
    });
    v.addEventListener("mouseleave", () => tip.classList.remove("ver"));
  }

  /* ═══ PUESTOS ═══ */
  function puestos(v) {
    const admin = st.yo.admin;
    const ultimaSync = st.sincronizaciones[0];
    v.innerHTML = `
      <section class="cab"><div><div class="eyebrow">La casa</div><h1>Puestos</h1><p class="sub">Cada vacante con su formulario del CRM y su rúbrica. Hoy ${st.puestos.filter((p) => p.activo !== 0).length} puestos; mañana los que hagan falta.</p></div>
        <div class="cab-acciones">${admin ? `<button class="btn btn-contorno btn-chico" id="btn-sync" title="Trae lo nuevo de todos los formularios">↻ Traer del CRM</button><button class="btn btn-contorno btn-chico" id="btn-agregar">Agregar CSV</button><button class="btn btn-contorno btn-chico" id="btn-etiquetas" title="DeepSeek y Claude vuelven a leer todo el lote y debaten quién es la más lista 1 y 2 y la más empática 1 y 2 (puede tardar varios minutos)">🧠 Volver a deliberar etiquetas</button><button class="btn btn-navy btn-chico" id="btn-nuevo-puesto">+ Nuevo puesto</button>` : ""}</div></section>
      ${admin ? (st.crm && st.crm.llave ? `<div class="ok-caja">Conectado al CRM de la subcuenta Talento. ${ultimaSync ? `Última sincronización: ${fecha(ultimaSync.cuando)} · ${ultimaSync.nuevas ?? 0} nuevas.` : "Todavía no se ha sincronizado."} Se trae lo nuevo cada mañana a las 6:33.</div>` : `<div class="aviso-caja"><b>Falta la llave del CRM de la subcuenta Talento.</b> La llave de SuperLeads no alcanza para esa subcuenta. Pasos: en el CRM, en la subcuenta «Talento | Ricardo», entra a Configuración → Integraciones privadas → Crear, con permisos de lectura de formularios y contactos. Copia la llave y en la Mac corre <code>cd ~/Desktop/HTML/Talento && npx wrangler secret put GHL_TALENTO_API_KEY</code>. Mientras, «Agregar CSV» sigue funcionando con el export de Envíos.</div>`) : ""}
      <div class="puestos-lista">${st.puestos.map(tarjetaPuesto).join("")}</div>
      <div id="editor-puesto"></div>
      ${admin && st.sincronizaciones.length ? `<div class="grafica"><h3>Últimas sincronizaciones</h3><table class="sync-tabla"><tr><th>Cuándo</th><th>Puesto</th><th>Origen</th><th class="derecha">Recibidas</th><th class="derecha">Nuevas</th><th class="derecha">Volvieron</th><th>Error</th></tr>${st.sincronizaciones.map((s) => `<tr><td>${new Date(s.cuando).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td><td>${esc((st.porPuesto[s.puesto] || { nombre: s.puesto }).nombre)}</td><td>${s.origen}</td><td class="derecha">${s.recibidas ?? "—"}</td><td class="derecha">${s.nuevas ?? "—"}</td><td class="derecha">${s.volvieron ?? "—"}</td><td>${esc(s.error || "")}</td></tr>`).join("")}</table></div>` : ""}`;
  }
  function tarjetaPuesto(p) {
    const l = st.todas.filter((c) => c.puesto === p.id);
    const a = l.filter((c) => c.nivel === "A").length, proceso = l.filter((c) => ["contactada", "entrevista", "prueba"].includes(etapaDe(c))).length, contr = l.filter((c) => etapaDe(c) === "contratada").length;
    return `<article class="puesto-card ${p.activo === 0 ? "inactivo" : ""}">
      <h3>${esc(p.nombre)} <span class="insignia">${esc(p.prefijo || "")}</span>${p.activo === 0 ? `<span class="insignia aviso">Pausado</span>` : ""}${p.enCodigo ? "" : `<span class="insignia">Creado en el tablero</span>`}</h3>
      <p class="pc-desc">${esc(p.descripcion || "")}${p.sueldo ? ` <b>${esc(p.sueldo)}.</b>` : ""}</p>
      ${(st.etiquetas || []).some((e) => e.puesto === p.id) ? `<div class="insignias">${(st.etiquetas || []).filter((e) => e.puesto === p.id).map((e) => { const c = st.porId[e.id]; return c ? `<span class="etq etq-${e.etiqueta} chica" title="${esc(e.motivo || "")}">${e.etiqueta === "lista" ? "🧠" : "💛"} ${e.orden || 1} · ${esc(T.primer(c.nombre))}</span>` : ""; }).join("")}</div>` : (l.length >= 100 ? "" : `<small class="quien">Las etiquetas «más lista» y «más empática» aparecen a partir de 100 candidatas.</small>`)}
      ${comoLoDecidieron(p)}
      <div class="pc-cifras"><span><b>${l.length}</b>candidatas</span><span><b>${a}</b>para llamar</span><span><b>${proceso}</b>en proceso</span><span><b>${contr}</b>contratadas</span></div>
      ${compartirHTML(p)}
      <div class="pc-acciones"><button class="btn btn-navy btn-chico" data-ver-puesto="${p.id}">Ver candidatas</button>${st.yo.admin ? `<button class="btn btn-contorno btn-chico" data-editar-puesto="${p.id}">Editar</button><button class="btn btn-fantasma btn-chico" data-sync-puesto="${p.id}">↻ Traer</button>` : ""}</div>
    </article>`;
  }
  // RLR · Compartir: la página y el formulario de cada puesto, para copiar o mandar por WhatsApp
  function ligaHTML(titulo, url, mensaje) {
    return `<div class="liga-fila"><span class="liga-t">${esc(titulo)}</span><a class="liga-url" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)}">${esc(url.replace(/^https?:\/\//, ""))}</a>
      <span class="liga-acciones"><button type="button" class="btn btn-contorno btn-chico" data-copiar-liga="${esc(url)}">Copiar</button><a class="btn btn-navy btn-chico" href="https://wa.me/?text=${encodeURIComponent(`${mensaje} ${url}`)}" target="_blank" rel="noopener">${ICONO_WA}WhatsApp</a></span></div>`;
  }
  function compartirHTML(p) {
    const filas = [];
    if (p.pagina) filas.push(ligaHTML("Página de la vacante", p.pagina, `Te comparto la vacante de ${p.nombre.toLowerCase()} en Torreón. Aquí están los detalles y la solicitud:`));
    for (const f of p.formularios || []) filas.push(ligaHTML((p.formularios.length > 1 ? `Formulario · ${f.nombre || f.id}` : "Formulario de solicitud"), `https://link.superleads.mx/widget/form/${f.id}`, `Te comparto la solicitud para ${p.nombre.toLowerCase()} en Torreón:`));
    return `<div class="compartir"><div class="compartir-cab"><b>Compartir</b><span class="quien">Copia la liga o mándala por WhatsApp</span></div>${filas.join("") || `<span class="quien">Sin página ni formulario ligados.</span>`}</div>`;
  }
  // RLR · el debate entre DeepSeek y Claude que decidió las etiquetas del puesto
  function comoLoDecidieron(p) {
    const d = (st.deliberaciones || []).find((x) => x.puesto === p.id);
    if (!d) return "";
    const nom = (id) => T.nombreHTML((st.porId[id] || { nombre: id }).nombre);
    const pos = (r) => r.error ? `<i>falló: ${esc(r.error)}</i>` : `listas: ${nom(r.listas[0].id)} y ${nom(r.listas[1].id)} · empáticas: ${nom(r.empaticas[0].id)} y ${nom(r.empaticas[1].id)}${r.nota ? `<br><span class="quien">${T.priv(r.nota)}</span>` : ""}`;
    const COMO = { acuerdo: "Coincidieron a la primera", reconsideracion: "Se pusieron de acuerdo tras leerse", conteo: "No coincidieron del todo: se sumaron sus votos", "un-solo-motor": "Solo pudo opinar una de las dos" };
    return `<details class="delib"><summary>🧠💛 Cómo lo decidieron DeepSeek y Claude · ${esc(COMO[d.resultado.como] || d.resultado.como)} · ${fecha(d.cuando)}</summary>
      <p class="g-sub">Leyeron las ${d.leidas} solicitudes del puesto, cada uno por su lado.</p>
      <ol>${d.rondas.map((r) => `<li><b>Ronda ${r.ronda} · ${r.motor === "deepseek" ? "DeepSeek" : "Claude"}:</b> ${pos(r)}</li>`).join("")}</ol>
      <p class="g-sub"><b>Conclusión:</b> ${esc(d.acuerdo || "")}</p></details>`;
  }
  function editorPuesto(p) {
    const nuevo = !p;
    const rub = p ? p.rubrica : null;
    const med = rub ? rub.medidores : [["Seriedad", "p_seriedad", 25], ["Experiencia", "p_exp", 25], ["Criterio", "p_limpieza", 20], ["Trato", "p_armonia", 20], ["Extra", "p_cocina", 10]];
    const forms = p ? p.formularios : [];
    $("#editor-puesto").innerHTML = `<form class="form-editor" id="form-puesto" data-id="${p ? esc(p.id) : ""}">
      <h2>${nuevo ? "Nuevo puesto" : `Editar «${esc(p.nombre)}»`}</h2>
      <div class="campos-fila">
        <div class="campo"><label>Nombre</label><input name="nombre" required maxlength="80" value="${p ? esc(p.nombre) : ""}" placeholder="Ej. Chofer de la casa"></div>
        <div class="campo"><label>Nombre corto</label><input name="corto" maxlength="30" value="${p ? esc(p.corto) : ""}" placeholder="Chofer"></div>
        <div class="campo"><label>Prefijo del contacto</label><input name="prefijo" maxlength="3" value="${p ? esc(p.prefijo) : ""}" placeholder="CH"><small>Se antepone al nombre al guardar el contacto.</small></div>
        <div class="campo"><label>Orden</label><input name="orden" type="number" min="1" max="99" value="${p ? p.orden : st.puestos.length + 1}"></div>
      </div>
      <div class="campo"><label>El arreglo, en una o dos frases (horario y qué se ofrece)</label><textarea name="descripcion" rows="2" maxlength="600" class="entrada-texto">${p ? esc(p.descripcion) : ""}</textarea></div>
      <div class="campos-fila">
        <div class="campo"><label>Sueldo o mínimo para filtrar (se le recuerda a la candidata en el sondeo)</label><input name="sueldo" maxlength="120" value="${p ? esc(p.sueldo || "") : ""}" placeholder="Ej. $1,900 MXN a la semana + IMSS"></div>
        <div class="campo"><label>Página pública de la vacante</label><input name="pagina" maxlength="200" value="${p ? esc(p.pagina || "") : ""}" placeholder="https://perfil.capitaltorreon.com/…"><small>Se comparte desde aquí y se liga en la página de gracias del sondeo.</small></div>
      </div>
      <div class="campo"><label>Formulario del CRM</label>
        <div class="campos-fila"><input name="formulario_id" maxlength="40" value="${forms[0] ? esc(forms[0].id) : ""}" placeholder="Id del formulario (está en la liga link.superleads.mx/widget/form/…)" ${p && p.enCodigo ? "readonly" : ""}><button type="button" class="btn btn-contorno btn-chico" id="btn-leer-form" ${p && p.enCodigo ? "disabled" : ""}>Leer sus preguntas</button></div>
        <small>${forms.length > 1 ? `Este puesto lee ${forms.length} formularios: ${forms.map((f) => esc(f.nombre)).join(" · ")}.` : "Al leerlo se proponen las preguntas; ajusta la clave corta de cada una si quieres."}</small></div>
      <div class="campo"><label>Preguntas que se leen del formulario</label><div class="preguntas-editor" id="preguntas-editor">${(p ? p.preguntas : []).map(filaPregunta).join("") || `<small>Lee el formulario para proponerlas.</small>`}</div></div>
      <div class="campo"><label>Rúbrica: cinco medidores (nombre y puntos máximos; con intensidad y riesgo suma 100)</label>
        <div class="medidores-editor">${med.map((m, i) => `<div class="campo"><input name="med_n_${i}" maxlength="30" value="${esc(m[0])}" aria-label="Nombre del medidor ${i + 1}"><input name="med_m_${i}" type="number" min="5" max="40" value="${m[2]}" aria-label="Máximo del medidor ${i + 1}"></div>`).join("")}</div>
        <label class="campo"><small><input type="checkbox" name="exp_auto" ${rub && rub.exp_auto ? "checked" : ""}> La experiencia se calcula sola a partir de «¿Cuántos años…?» (opciones del formulario de casa)</small></label></div>
      <div class="campo"><label>Instrucciones para Claude (la rúbrica con la que califica)</label><textarea name="contexto" rows="9" class="entrada-texto" maxlength="6000">${rub ? esc(rub.contexto || "") : ""}</textarea><small>Las claves que Claude devuelve son fijas: seriedad, limpieza, armonia, cocina, riesgo (y experiencia si no es automática). Los nombres de arriba son lo que ve la casa.</small></div>
      <div class="cab-acciones">${p && !p.enCodigo ? `<label class="campo"><small><input type="checkbox" name="activo" ${p.activo !== 0 ? "checked" : ""}> Activo (se ve en el tablero)</small></label>` : ""}<button class="btn btn-navy" type="submit">Guardar puesto</button><button class="btn btn-fantasma" type="button" id="btn-cancelar-puesto">Cancelar</button></div>
    </form>`;
    $("#editor-puesto").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const filaPregunta = (q) => `<div class="preg-fila" data-id="${esc(q.id)}"><span class="etq" title="${esc(q.etiqueta)}">${esc(q.etiqueta)}</span><input value="${esc(q.clave)}" data-clave aria-label="Clave corta" maxlength="30"><input value="${esc(q.corta || "")}" data-corta aria-label="Cómo se muestra" maxlength="120" placeholder="Cómo se muestra"></div>`;
  async function leerFormulario() {
    const f = $("#form-puesto"); const id = f.formulario_id.value.trim().match(/[A-Za-z0-9]{10,30}$/);
    if (!id) { aviso("Pega el id o la liga del formulario"); return; }
    aviso("Leyendo el formulario…");
    try {
      const d = await api(`/api/formulario?id=${id[0]}`);
      f.formulario_id.value = id[0]; f.dataset.formNombre = d.titulo || id[0];
      $("#preguntas-editor").innerHTML = d.preguntas.map(filaPregunta).join("") || `<small>Ese formulario no tiene preguntas además de los datos de contacto.</small>`;
      if (!f.nombre.value && d.titulo) f.nombre.value = d.titulo.slice(0, 80);
      aviso(`${d.preguntas.length} preguntas leídas`);
    } catch { aviso("No pude leer ese formulario"); }
  }
  async function guardarPuesto(ev) {
    ev.preventDefault();
    const f = ev.target; const id = f.dataset.id;
    const prev = id ? st.porPuesto[id] : null;
    const formId = f.formulario_id.value.trim();
    const cuerpo = {
      id, nombre: f.nombre.value.trim(), corto: f.corto.value.trim(), prefijo: f.prefijo.value.trim(), orden: Number(f.orden.value) || undefined,
      descripcion: f.descripcion.value.trim(), sueldo: f.sueldo.value.trim(), pagina: f.pagina.value.trim(), activo: f.activo ? f.activo.checked : undefined,
      formularios: prev && prev.enCodigo ? prev.formularios : (formId ? [{ id: formId, nombre: f.dataset.formNombre || (prev && prev.formularios[0] && prev.formularios[0].id === formId ? prev.formularios[0].nombre : f.nombre.value.trim()) }] : []),
      preguntas: $$(".preg-fila", f).map((r) => ({ id: r.dataset.id, etiqueta: r.querySelector(".etq").title, clave: r.querySelector("[data-clave]").value.trim(), corta: r.querySelector("[data-corta]").value.trim() })),
      rubrica: { medidores: [0, 1, 2, 3, 4].map((i) => [f[`med_n_${i}`].value.trim(), "", Number(f[`med_m_${i}`].value)]), contexto: f.contexto.value.trim(), exp_auto: f.exp_auto.checked },
    };
    if (prev && prev.enCodigo) cuerpo.preguntas = prev.preguntas;
    try {
      await api("/api/puesto", cuerpo);
      aviso("Puesto guardado");
      await T.cargar();
      $("#editor-puesto").innerHTML = "";
    } catch { aviso("No se guardó el puesto"); }
  }

  /* ═══ MENSAJES ═══ */
  function mensajes(v) {
    v.innerHTML = `
      <section class="cab"><div><div class="eyebrow">La casa</div><h1>Mensajes de WhatsApp</h1><p class="sub">El mensaje elegido se precarga en todos los botones de WhatsApp de ese puesto. Las ediciones las ve toda su casa.</p></div></section>
      <div class="lista">${st.puestos.filter((p) => p.activo !== 0).map((p) => {
        const [clave, nombre] = T.opcionMensaje(p.id);
        const texto = T.textoMensaje(p.id, clave);
        const editado = (st.mensajes || []).some((m) => m.puesto === p.id && m.clave === clave);
        return `<section class="mensaje-bar">
          <div class="mensaje-cab"><span class="mensaje-t">${esc(p.nombre)}</span><span class="mensaje-sub">Elige cuál se manda</span></div>
          <div class="mensaje-ops" role="radiogroup" aria-label="Mensaje para ${esc(p.nombre)}">${(p.mensajes || []).map(([k, n]) => `<button type="button" role="radio" aria-checked="${k === clave}" class="chip ${k === clave ? "activo" : ""}" data-mensaje="${k}" data-puesto-msg="${p.id}">${esc(n)}</button>`).join("")}</div>
          <p class="mensaje-vista">«${esc(texto.replace(/\{nombre\}/g, "María"))}»</p>
          <div class="mensaje-pie"><button type="button" class="btn btn-contorno btn-chico" data-editar-mensaje="${p.id}">Editar «${esc(nombre)}»</button>${editado ? `<span class="quien">Editado para su casa</span>` : ""}</div>
        </section>`;
      }).join("")}</div>`;
  }

  /* ═══ CÓMO LAS ORDENÉ ═══ */
  const EXPLICA = {
    p_seriedad: "Referencias con nombre o teléfono, ex patrones, constancia y cuidado al contestar.",
    p_exp: "Sale directo de lo que contestó o de lo que cuenta.",
    p_limpieza: "Criterio: cómo piensa su trabajo y si sabe explicar por qué.",
    p_armonia: "Trato, calma y respeto por el ritmo de la familia.",
    p_cocina: "Lo que suma además de lo que se pidió.",
  };
  const EXPLICA_PUESTO = {
    domestica: { p_limpieza: "Qué limpia primero y si sabe explicar por qué.", p_armonia: "Trato con niños, calma, gusto por servir y respeto por el ritmo de la familia.", p_cocina: "Variedad y comida que le guste a una niña." },
    finde: { p_limpieza: "Qué limpia primero y si sabe explicar por qué.", p_armonia: "Calma, gusto por servir y respeto por una familia que descansa.", p_cocina: "Comida casera para una familia con una niña." },
    guia: { p_exp: "Formación o práctica Montessori (casa de niños, diplomado, AMI/AMS) primero; preescolar o guardería con niños de 3 a 6 en medio.", p_limpieza: "Mirada Montessori: ambiente preparado, seguir a la niña, independencia, libertad con límites; no entretener ni hacer por ella.", p_armonia: "Ante frustración o llanto: se agacha, nombra la emoción, espera y sostiene el límite con amabilidad; sin premios ni castigos.", p_cocina: "Confianza y discreción dentro de un hogar.", p_seriedad: "CV, referencias con teléfono, cartas y cuidado al contestar." },
    masajista: { p_exp: "Años dando masajes y lugares donde ha trabajado.", p_seriedad: "Certificaciones comprobables, CV y claridad en la tarifa.", p_limpieza: "Qué técnicas domina y cómo las explica.", p_armonia: "Automóvil propio y equipo portátil para llegar a domicilio.", p_cocina: "Presentación, puntualidad y confidencialidad." },
  };
  function como(v) {
    v.innerHTML = `
      <section class="cab"><div><div class="eyebrow">La casa</div><h1>Cómo las ordené</h1><p class="sub">Cada puesto tiene su rúbrica. Las primeras las revisé una por una; las que llegan después las califica Claude con la misma rúbrica, calibrada con esas.</p></div></section>
      <section class="grafica criterio-etq"><h3>Más lista y más empática</h3><p class="g-sub">Aparte del puntaje, a TODAS las candidatas se les califica con el mismo criterio dos cosas de 0 a 10, leyendo solo lo que escribieron. Con eso a la vista, <b>dos inteligencias, DeepSeek y Claude, leen el lote completo del puesto y debaten</b> quién es la más lista 1 y 2 y la más empática 1 y 2: cada una propone, si no coinciden leen los motivos de la otra y reconsideran, y si aún difieren se suman sus votos. Solo en puestos con 100 candidatas o más; cuando llega una candidata nueva, se califica y el comité vuelve a deliberar. En Puestos se puede leer cómo lo decidieron.</p>
        <table class="tabla-como"><tr><th>Listeza (inteligencia práctica)</th><th>Empatía (calidez real)</th></tr>
          <tr><td><b>0 a 3.</b> No entiende lo que se le pregunta o contesta con una palabra.</td><td><b>0 a 3.</b> Solo habla de tareas o de sí misma; no aparece nadie más.</td></tr>
          <tr><td><b>4 a 6.</b> Contesta lo que se pide, con algún detalle, sin explicar el porqué.</td><td><b>4 a 6.</b> Menciona a la familia o a la niña, con amabilidad general.</td></tr>
          <tr><td><b>7 a 8.</b> Criterio y orden; explica el porqué; detalles concretos y útiles.</td><td><b>7 a 8.</b> Se pone en el lugar del otro: escuchar, paciencia, respetar el ritmo de la casa.</td></tr>
          <tr><td><b>9 a 10.</b> Además anticipa problemas y propone cómo resolverlos.</td><td><b>9 a 10.</b> Además cuenta con detalle una situación real de cuidado y lo que sintió el otro.</td></tr>
        </table></section>
      <div class="lista">${st.puestos.filter((p) => p.activo !== 0).map((p) => `<section class="grafica">
        <h3>${esc(p.nombre)}</h3><p class="g-sub">${esc(p.descripcion || "")}</p>
        <table class="tabla-como"><tr><th>Qué se mide</th><th class="derecha">Puntos</th></tr>
          ${medidoresDe(p).map(([n, k, max]) => `<tr><td><b>${esc(n)}.</b> ${esc((EXPLICA_PUESTO[p.id] || {})[k] || EXPLICA[k] || "")}</td><td class="derecha">${max}</td></tr>`).join("")}
          <tr><td><b>Intensidad.</b> Volvió a llenar el formulario. Más puntos si regresó semanas después.</td><td class="derecha">+5</td></tr>
          <tr><td><b>Riesgo.</b> Contradicciones, planes de irse, lejanía o respuestas copiadas.</td><td class="derecha">−8</td></tr>
        </table>
        <p class="g-sub"><b>Llamar primero</b> son 70 puntos o más. <b>Buena opción</b> de 55 a 69. <b>Con reservas</b> de 37 a 54. <b>No la recomendamos</b> abajo de 37${(p.rubrica && p.rubrica.descarta || []).length ? ", o si no acepta el arreglo del puesto" : ""}.</p>
      </section>`).join("")}</div>`;
  }

  /* ═══ ENTRADAS ═══ */
  async function entradas(v) {
    v.innerHTML = `<section class="cab"><div><div class="eyebrow">Solo Ricardo</div><h1>Entradas y sincronizaciones</h1><p class="sub">Quién entró, qué importó, qué trajo el reloj del CRM y qué SMS fueron y vinieron.</p></div></section><div class="grafica" id="sms-caja"></div><div class="grafica" id="bitacora-caja">Cargando…</div>`;
    try {
      const d = await api("/api/bitacora");
      const acc = { "entró": "Entró", "importó": "Subió un archivo", "sincronizó": "Sincronizó con el CRM", "contrató": "Contrató", "compartió": "Compartió una ficha", "puesto": "Editó un puesto" };
      const acc2 = { ...acc, "sondeó": "Preguntó disponibilidad", "sms": "Contestó por SMS", "dijo que sí": "Dijo que sí", "dijo que no": "Dijo que no" };
      $("#bitacora-caja").innerHTML = `<table class="bitacora-tabla">${d.bitacora.map((b) => `<tr><td>${esc(nombreDe(b.quien))}</td><td>${esc(acc2[b.accion] || b.accion)}</td><td>${new Date(b.cuando).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td><td>${esc(b.accion === "entró" ? b.detalle : ["contrató", "sondeó", "dijo que sí", "dijo que no"].includes(b.accion) ? (st.porId[b.detalle] || { nombre: "" }).nombre : b.accion === "sincronizó" ? resumenSync(b.detalle) : b.accion === "importó" ? resumenImport(b.detalle) : b.accion === "sms" ? resumenSMS(b.detalle) : "")}</td></tr>`).join("") || "<tr><td>Sin registros</td></tr>"}</table>`;
      $("#sms-caja").innerHTML = smsHTML(d);
    } catch { $("#bitacora-caja").textContent = "No se pudo leer la bitácora."; }
  }
  const resumenSMS = (t) => { try { const d = JSON.parse(t); return `${d.id && st.porId[d.id] ? st.porId[d.id].nombre : `celular ${d.de || ""}`}: «${d.texto || ""}»${d.interpretado ? ` → ${d.interpretado === "si" ? "sí" : "no"}` : " (no se entendió como sí/no)"}`; } catch { return ""; } };
  // RLR · SMS de ida y vuelta por Telnyx, con su acuse de entrega
  const smsHTML = (d) => {
    const lista = d.sms || [], t = d.telnyx || {};
    const quien = (x) => x.candidata && st.porId[x.candidata] ? T.nombreHTML(st.porId[x.candidata]) : esc(T.sens(x.direccion === "entrante" ? x.de : x.para));
    const pill = (e) => `<span class="sms-estado ${/entregado|recibido/.test(e) ? "bien" : /fall/.test(e) ? "mal" : ""}">${esc(e || "")}</span>`;
    return `<h3>SMS</h3><p class="quien">Proveedor activo: <b>${t.proveedor === "smsmasivos" ? "SMS Masivos (rutas mexicanas)" : t.proveedor === "telnyx" ? "Telnyx" : "ninguno"}</b>. Telnyx: número ${esc(t.numero || "—")}${t.alfa ? `, remitente de respaldo ${esc(t.alfa)}` : ""}, webhook ${t.llave_publica ? "con firma verificada" : "sin llave pública"}. Aquí se ven las entregas, las fallas y lo que contestan por SMS.</p>
      ${lista.length ? `<table class="sync-tabla"><tr><th>Cuándo</th><th></th><th>Quién</th><th>Texto</th><th>Estado</th></tr>${lista.map((x) => `<tr><td>${new Date(x.cuando).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td><td>${x.direccion === "entrante" ? "↙ recibido" : "↗ enviado"}</td><td>${quien(x)}</td><td>${esc(String(x.texto || "").slice(0, 140))}${x.interpretado ? ` <b>→ ${x.interpretado === "si" ? "sí" : "no"}</b>` : ""}</td><td>${pill(x.estado)}${x.error ? `<br><small class="quien">${esc(x.error)}</small>` : ""}</td></tr>`).join("")}</table>` : `<p class="quien">Todavía no ha salido ni llegado ningún SMS.</p>`}`;
  };
  const resumenSync = (t) => { try { const d = JSON.parse(t); if (d.error) return d.mensaje || d.error; return (d.puestos || []).map((p) => `${(st.porPuesto[p.puesto] || { nombre: p.puesto }).nombre}: ${p.error || `${p.nuevas} nuevas, ${p.volvieron} volvieron`}`).join(" · "); } catch { return ""; } };
  const resumenImport = (t) => { try { const d = JSON.parse(t); return `${(st.porPuesto[d.puesto] || { nombre: d.puesto || "" }).nombre}: ${d.nuevas} nuevas, ${d.volvieron} volvieron, ${d.sinCambio} sin cambio`; } catch { return ""; } };

  /* ═══ eventos propios de estas pantallas ═══ */
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    const bCop = t.closest("[data-copiar-liga]");
    if (bCop) { ev.stopPropagation(); const u = bCop.dataset.copiarLiga; navigator.clipboard.writeText(u).then(() => aviso("Liga copiada")).catch(() => aviso(u, 8000)); return; }
    const bMover = t.closest("[data-mover]");
    if (bMover) { ev.stopPropagation(); mover(bMover.dataset.mover, bMover.dataset.a); return; }
    const bVer = t.closest("[data-ver-puesto]");
    if (bVer) { T.usarPuesto(bVer.dataset.verPuesto, false); ir("tablero"); return; }
    const bEd = t.closest("[data-editar-puesto]");
    if (bEd) { editorPuesto(st.porPuesto[bEd.dataset.editarPuesto]); return; }
    const bSy = t.closest("[data-sync-puesto]");
    if (bSy) { T.sincronizar(bSy.dataset.syncPuesto); return; }
    if (t.id === "btn-nuevo-puesto") { editorPuesto(null); return; }
    if (t.id === "btn-leer-form") { leerFormulario(); return; }
    if (t.id === "btn-cancelar-puesto") { $("#editor-puesto").innerHTML = ""; return; }
    if (t.id === "btn-si-contratar" && porContratarEmbudo) {
      const { id, x, y } = porContratarEmbudo; porContratarEmbudo = null;
      $("#dlg-contratar").close();
      guardarMarca(id, { estado: "contratada" }).then(() => { repintar(); aviso(`¡${st.porId[id].nombre} contratada!`); }).catch(() => aviso("No se guardó."));
      return;
    }
  }, true);
  document.addEventListener("submit", (ev) => { if (ev.target.id === "form-puesto") guardarPuesto(ev); });

  window.TalentoPantallas = { embudo, analitica, puestos, mensajes, como, entradas };
})();
/* fin · RLR · Ricardo López Reyero */
