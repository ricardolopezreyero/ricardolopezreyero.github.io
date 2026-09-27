/* ─────────────────────────────────────────────────────────────
 *  RLR · Candidatas para la casa · tablero
 *  Autor: Ricardo López Reyero · build eye · rev 181218
 * ───────────────────────────────────────────────────────────── */
(() => {
  const _RLR = "Ricardo López Reyero";
  const _k = "EYE", _rev = 181218; // candado de autoría

  // RLR · la pantalla puede vivir en GitHub Pages o en el Worker; la API siempre está en el Worker
  const EN_PAGES = location.hostname.endsWith("github.io");
  const API = EN_PAGES ? "https://talento.noisy-shape-4fc9.workers.dev" : "";
  const INICIO = EN_PAGES ? "./" : "/";
  const ENTRADA = EN_PAGES ? "entrar.html" : "/";
  const leerLlave = () => { try { return localStorage.getItem("talento-llave") || ""; } catch { return ""; } };
  const ponerLlave = (v) => { try { v ? localStorage.setItem("talento-llave", v) : localStorage.removeItem("talento-llave"); } catch { /* sin almacenamiento */ } };
  if (EN_PAGES && !leerLlave()) location.replace(ENTRADA);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const st = { comparar: { domestica: [], guia: [] }, nombres: {}, ocupadas: new Set(), yo: null, todas: [], lista: [], porId: {}, marcas: {}, q: "", filtro: "todas", verD: false, total: 0, puesto: "domestica" };

  /* ─── utilidades ─── */
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fecha(iso) {
    if (!iso) return "—";
    if (/Z$|[+-]\d{2}:\d{2}$/.test(iso)) {
      const t = new Date(iso);
      return `${t.getDate()} ${MESES[t.getMonth()]} ${t.getFullYear()}`;
    }
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${y}`;
  }
  function hace(iso) {
    if (!iso) return "";
    const dias = Math.floor((Date.now() - new Date(iso.slice(0, 19))) / 86400000);
    if (dias < 1) return "hoy";
    if (dias < 14) return `hace ${dias} días`;
    if (dias < 60) return `hace ${Math.round(dias / 7)} semanas`;
    return `hace ${Math.round(dias / 30)} meses`;
  }
  const reciente = (c) => c.ultimo_envio && (Date.now() - new Date(c.ultimo_envio.slice(0, 19))) / 86400000 <= 60;
  const tel = (t) => (t && t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t || "—");
  const primer = (n) => String(n || "").split(" ").find((w) => w.length > 2 && !/^ma\.?$/i.test(w)) || n;
  const iniciales = (n) => String(n || "").split(" ").filter((w) => w.length > 2 && !/\.$/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  /* RLR · mensajes de WhatsApp: tres opciones por puesto, editables para toda la casa */
  const MENSAJES = {
    domestica: [
      ["entre", "Entre semana", "Hola {nombre}, buen día. Le escribo por la solicitud que llenó para trabajar en casa de planta entre semana: entrada el lunes de 8 a 9 de la mañana, salida el viernes de 5 a 7 de la tarde, y se queda a dormir de lunes a jueves. ¿Sigue disponible? Me gustaría platicar con usted."],
      ["finde", "Fin de semana", "Hola {nombre}, buen día. Le escribo por la solicitud que llenó para trabajar en casa. Estamos buscando apoyo para los fines de semana. ¿Tendría disponibilidad el sábado y el domingo? Me gustaría platicar con usted."],
      ["generico", "Genérico", "Hola {nombre}, buen día. Le escribo por la solicitud que llenó para trabajar en casa. ¿Sigue disponible? Me gustaría platicar con usted."],
    ],
    guia: [
      ["entre", "Tardes entre semana", "Hola {nombre}, buen día. Le escribo por su solicitud como guía para nuestra hija de 4 años. Buscamos a alguien que la acompañe por las tardes entre semana, unas 4 horas al día. ¿Sigue disponible? Me gustaría agendar una entrevista."],
      ["finde", "Fin de semana", "Hola {nombre}, buen día. Le escribo por su solicitud como guía para nuestra hija de 4 años. Buscamos a alguien que la acompañe los fines de semana. ¿Tendría disponibilidad el sábado o el domingo? Me gustaría agendar una entrevista."],
      ["generico", "Genérico", "Hola {nombre}, buen día. Le escribo por su solicitud como guía para nuestra hija de 4 años. ¿Sigue disponible? Me gustaría platicar con usted."],
    ],
  };
  const guardado = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
  function opcionMensaje(puesto) {
    const ops = MENSAJES[puesto] || MENSAJES.domestica;
    const k = guardado(`talento-mensaje-${puesto}`, ops[0][0]);
    return ops.find((o) => o[0] === k) || ops[0];
  }
  function textoMensaje(puesto, clave) {
    const propio = (st.mensajes || []).find((m) => m.puesto === puesto && m.clave === clave);
    if (propio) return propio.texto;
    const o = (MENSAJES[puesto] || MENSAJES.domestica).find((x) => x[0] === clave);
    return o ? o[2] : "";
  }
  function wa(c, t = c.celular) {
    const [clave] = opcionMensaje(c.puesto || "domestica");
    const txt = textoMensaje(c.puesto || "domestica", clave).replace(/\{nombre\}/g, primer(c.nombre));
    return `https://wa.me/52${t}?text=${encodeURIComponent(txt)}`;
  }
  const ICONO_WA = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.2Z"/></svg>`;
  const ICONO_TEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>`;
  const ICONO_PREG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5M12 16.5h.01"/></svg>`;

  const VEREDICTO = {
    P: { corto: "Nueva · por evaluar", largo: "Nueva · por evaluar", frase: "Todavía no la evaluamos." },
    A: { corto: "Llamar primero", largo: "La recomendamos para la casa", frase: "Sí la metería a la casa." },
    B: { corto: "Buena opción", largo: "Buena opción para la casa", frase: "Vale la pena una llamada." },
    C: { corto: "Con reservas", largo: "Con reservas", frase: "Solo si las primeras no resultan." },
    D: { corto: "No la recomendamos", largo: "No la recomendamos", frase: "No la recomendamos para la casa." },
  };
  function veredicto(c) {
    const v = { ...VEREDICTO[c.nivel || "P"] };
    if (c.nivel === "D" && c.descartada) { v.largo = "No acepta quedarse de planta"; v.frase = "No cumple el arreglo de quedarse a dormir."; }
    if (c.evaluo === "pendiente" && c.nivel !== "P") v.corto += " · volvió a llenar";
    return v;
  }
  const LUGARES = ["primera", "segunda", "tercera"];

  // RLR · puestos: cada uno con su rúbrica y sus textos
  const PUESTOS = {
    domestica: {
      nombre: "Empleado doméstico",
      titulo: "Quién debería entrar a <em>la casa</em>",
      sub: (n, extra) => `${n} candidatas ordenadas de mejor a peor para una casa con armonía, limpieza, alegría y seriedad. Estas tres son las que yo llamaría primero. Otras ${extra} también valen la llamada.`,
      medidores: [["Seriedad", "p_seriedad", 25], ["Experiencia", "p_exp", 20], ["Limpieza", "p_limpieza", 20], ["Armonía", "p_armonia", 20], ["Cocina", "p_cocina", 10]],
    },
    guia: {
      nombre: "Guía",
      titulo: "Quién debería ser <em>la guía</em>",
      sub: (n, extra) => `${n} candidatas a guía para las tardes de la niña, ordenadas de mejor a peor por experiencia, criterio pedagógico, calma y confianza. Estas tres son las que yo entrevistaría primero. Otras ${extra} también valen la llamada.`,
      medidores: [["Experiencia", "p_exp", 25], ["Pedagogía", "p_limpieza", 20], ["Calma", "p_armonia", 20], ["Confianza", "p_cocina", 15], ["Seriedad", "p_seriedad", 15]],
    },
  };
  const P = () => PUESTOS[st.puesto] || PUESTOS.domestica;
  const PC = (c) => PUESTOS[c.puesto] || PUESTOS.domestica;

  function medidores(c) {
    if (c.puntos == null) return `<div class="m-nombre">Sin calificación todavía</div>`;
    const m = PC(c).medidores.map(([n, k, max]) => [n, c[k], max]);
    const aj = [];
    if (c.p_intensidad) aj.push(`<span class="insignia">+${c.p_intensidad} volvió a llenar</span>`);
    if (c.p_riesgo) aj.push(`<span class="insignia">−${c.p_riesgo} por riesgo</span>`);
    return `<div class="medidores">${m.map(([n, v, max]) => `
      <div class="medidor" title="${n}: ${v ?? 0} de ${max}"><span class="m-nombre">${n}</span>
      <span class="m-barra"><i data-w="${Math.round(((v || 0) / max) * 100)}"></i></span>
      <span class="m-num">${v ?? 0}/${max}</span></div>`).join("")}
      ${aj.length ? `<div class="ajustes">${aj.join("")}</div>` : ""}</div>`;
  }

  function insignias(c) {
    const out = [];
    out.push(`<span class="insignia fuerte">${PC(c).nombre}</span>`);
    if (c.edad) out.push(`<span class="insignia">${c.edad} años</span>`);
    if (c.experiencia) out.push(`<span class="insignia">${esc(c.experiencia)} en casas</span>`);
    if (c.envios > 1) out.push(`<span class="insignia fuerte">Llenó ${c.envios} veces</span>`);
    if (reciente(c)) out.push(`<span class="insignia">Reciente</span>`);
    return out.join("");
  }

  const ESTADOS = [["favorita", "★ Me gusta"], ["contactada", "Contactada"], ["entrevista", "Entrevista"], ["contratada", "Contratada"], ["descartada", "Descartar"]];
  const esContratada = (c) => (st.marcas[c.id] || {}).estado === "contratada";
  // Contratada por otra familia: se ve en gris y no se puede marcar
  const esOcupada = (c) => !esContratada(c) && st.ocupadas && st.ocupadas.has(c.id);
  const noDisponible = (c) => esContratada(c) || esOcupada(c);
  const nombreDe = (rol) => (st.nombres && st.nombres[rol]) || rol || "";
  // WhatsApp se apaga cuando la candidata ya fue contratada
  function waBoton(c, clases, contenido) {
    if (noDisponible(c)) return `<span class="btn ${clases} btn-apagado" aria-disabled="true" title="Ya está contratada">${contenido}</span>`;
    return `<a class="btn ${clases}" href="${wa(c)}" target="_blank" rel="noopener">${contenido}</a>`;
  }
  function botonComparar(c, oscuro) {
    const dentro = (st.comparar[c.puesto] || []).includes(c.id);
    return `<button type="button" class="btn-comparar ${oscuro ? "oscuro" : ""} ${dentro ? "activo" : ""}" data-comparar="${c.id}" aria-pressed="${dentro}">${dentro ? "✓ En comparación" : "⇆ Comparar"}</button>`;
  }
  function marcasHTML(c) {
    const m = st.marcas[c.id] || {};
    const quien = m.cuando && m.estado ? `<span class="quien">${esc(nombreDe(m.quien))} · ${fecha(m.cuando)}</span>` : "";
    if (esOcupada(c)) {
      return `<div class="marcas marcas-contratada" data-id="${c.id}"><span class="sello">Contratada en otra casa</span></div>`;
    }
    if (m.estado === "contratada") {
      return `<div class="marcas marcas-contratada" data-id="${c.id}"><span class="sello">✓ Contratada</span><button type="button" class="no-contratar" data-accion="no-contratar">No contratar</button>${quien}</div>`;
    }
    return `<div class="marcas" data-id="${c.id}">${ESTADOS.map(([k, t]) => `<button type="button" data-estado="${k}" class="${m.estado === k ? "activo" : ""}" aria-pressed="${m.estado === k}">${t}</button>`).join("")}${quien}</div>`;
  }

  /* ─── avisos ─── */
  let tAviso;
  function aviso(t) {
    const a = $("#aviso"); $("span", a).textContent = t; a.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("ver"), 3000);
  }

  /* ─── API ─── */
  async function api(ruta, cuerpo) {
    const llave = leerLlave();
    const headers = { ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(llave ? { Authorization: `Bearer ${llave}` } : {}) };
    const r = await fetch(API + ruta, cuerpo ? { method: "POST", headers, body: JSON.stringify(cuerpo) } : { headers });
    if (r.status === 401) { ponerLlave(""); location.replace(ENTRADA); throw new Error("sesion"); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "error");
    return d;
  }

  async function cargar() {
    const d = await api("/api/candidatas");
    st.yo = d.yo; st.nombres = d.nombres || {}; st.ocupadas = new Set(d.ocupadas || []); st.mensajes = d.mensajes || [];
    st.marcas = d.marcas || {};
    const lugares = {};
    st.todas = d.candidatas.map((c) => {
      const p = c.puesto || "domestica";
      lugares[p] = lugares[p] || 0;
      return { ...c, puesto: p, lugar: c.nivel === "P" ? null : ++lugares[p] };
    });
    st.porId = Object.fromEntries(st.todas.map((c) => [c.id, c]));
    usarPuesto(st.puesto, false);
    $("#saludo").textContent = `Candidatas para la casa · Hola, ${d.yo.nombre}`;
    if (d.yo.admin) { $("#btn-agregar").classList.remove("oculto"); $("#btn-bitacora").classList.remove("oculto"); }
    pintarTodo();
    ruta();
  }

  function usarPuesto(p, pintar = true) {
    st.puesto = PUESTOS[p] ? p : "domestica";
    st.lista = st.todas.filter((c) => c.puesto === st.puesto);
    st.total = st.lista.filter((c) => c.nivel !== "P").length;
    st.filtro = "todas"; st.verD = false;
    $("#puestos").innerHTML = Object.entries(PUESTOS).map(([k, v]) => {
      const n = st.todas.filter((c) => c.puesto === k).length;
      return `<button class="puesto ${k === st.puesto ? "activo" : ""}" data-puesto="${k}" aria-pressed="${k === st.puesto}">${v.nombre}<b>${n}</b></button>`;
    }).join("");
    $("#hero-titulo").innerHTML = P().titulo;
    $$(".como").forEach((e) => e.classList.toggle("oculto", e.dataset.puesto !== st.puesto));
    if (pintar) { pintarTodo(); window.scrollTo(0, 0); }
  }

  /* ─── hero: las tres mejores ─── */
  function pintarPodio() {
    const tres = st.lista.filter((c) => c.nivel === "A").slice(0, 3);
    const n = st.total;
    const filtros = st.lista.filter((c) => c.nivel === "A").length;
    $("#hero-sub").textContent = P().sub(n, Math.max(0, filtros - 3));
    $("#podio").innerHTML = tres.map((c, i) => `
      <article class="ficha ${noDisponible(c) ? "contratada" : ""}" data-id="${c.id}">
        <div class="ficha-lugar"><b>${i + 1}</b><span>${LUGARES[i]} opción · ${c.puntos} puntos</span></div>
        <div>
          <h2>${esc(c.nombre)}</h2>
          <div class="ficha-meta">${[c.edad ? `${c.edad} años` : "", esc(c.colonia), esc(c.experiencia)].filter(Boolean).join(" · ")}</div>
        </div>
        <div class="ficha-tel tab">${tel(c.celular)}<small>Celular y WhatsApp${c.tel_extra ? ` · otro: ${tel(c.tel_extra)}` : ""}</small></div>
        <div class="ficha-acciones">
          ${waBoton(c, "btn-verde", `${ICONO_WA}WhatsApp`)}
          <button class="btn btn-contorno-claro" data-abrir="${c.id}">Ver ficha completa</button>
        </div>
        ${botonComparar(c, true)}
        <div><h3>Por qué es la ${LUGARES[i]}</h3><p>${esc(c.resumen)}</p></div>
        ${c.a_favor ? `<div><h3>Lo que la hace brillar</h3><p class="tenue">${esc(c.a_favor)}</p></div>` : ""}
        ${marcasHTML(c)}
      </article>`).join("");
  }

  /* ─── lista ─── */
  function pasaFiltro(c) {
    const m = st.marcas[c.id] || {};
    const f = st.filtro;
    if (f === "favorita" || f === "contactada" || f === "entrevista" || f === "contratada" || f === "descartada") { if (m.estado !== f) return false; }
    else if (f === "repetidas") { if (!(c.envios > 1)) return false; }
    else if (f === "recientes") { if (!reciente(c)) return false; }
    if (st.q) {
      const t = [c.nombre, c.colonia, c.comidas, c.limpia, c.porque, c.resumen, c.referido, c.celular, m.nota, c.a_favor].join(" ")
        .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (!st.q.split(/\s+/).every((p) => t.includes(p))) return false;
    }
    return true;
  }

  function tarjeta(c) {
    const v = veredicto(c);
    const m = st.marcas[c.id] || {};
    return `
    <article class="tarjeta ${m.estado === "descartada" ? "marcada-descartada" : ""} ${noDisponible(c) ? "contratada" : ""}" data-id="${c.id}" tabindex="0" aria-label="Ver ficha de ${esc(c.nombre)}">
      <div class="t-fila">
        <div class="avatar n${c.nivel}">${esc(iniciales(c.nombre))}${c.lugar ? `<b>${c.lugar}</b>` : ""}</div>
        <div>
          <div class="t-cab"><h3 class="t-nombre">${esc(c.nombre)}</h3><span class="veredicto v-${c.nivel}">${v.corto}</span></div>
          <div class="t-meta">${[esc(c.colonia), `Llenó ${fecha(c.ultimo_envio)} · ${hace(c.ultimo_envio)}`].filter(Boolean).join(" · ")}</div>
          <div class="insignias">${insignias(c)}</div>
          <p class="t-res">${esc(c.resumen || "—")}</p>
        </div>
        <div class="puntaje"><div class="puntaje-num tab">${c.puntos ?? "—"}<small>/100</small></div>${medidores(c)}</div>
      </div>
      <div class="t-acciones">
        ${waBoton(c, "btn-navy btn-chico", `${ICONO_WA}WhatsApp`)}
        <a class="btn btn-fantasma btn-chico" href="tel:+52${c.celular}">${ICONO_TEL}${tel(c.celular)}</a>
        ${marcasHTML(c)}
        ${botonComparar(c)}
        <span class="t-ver">Ver ficha completa →</span>
      </div>
    </article>`;
  }

  const SECCIONES = [
    ["A", "Llamar primero", "Las que yo metería a la casa. Empieza por aquí."],
    ["B", "Buenas opciones", "Vale la pena una llamada si las primeras no están disponibles."],
    ["C", "Con reservas", "Pueden servir, pero hay dudas importantes."],
    ["D", "No las recomendamos", "No aceptan quedarse, o sus respuestas no dan confianza. Aquí están por si acaso."],
  ];

  function pintarLista() {
    const vis = st.lista.filter(pasaFiltro);
    const pend = vis.filter((c) => c.nivel === "P");
    $("#pendientes").innerHTML = pend.length ? `
      <section class="seccion"><div class="seccion-cab"><h2>Nuevas por evaluar · ${pend.length}</h2>
      <p>Llegaron en el último archivo que subiste.</p>
      ${st.yo.admin ? `<button class="btn btn-navy btn-chico" id="btn-evaluar">Evaluar ahora</button>` : ""}</div>
      <div class="lista">${pend.map(tarjeta).join("")}</div></section>` : "";
    $("#secciones").innerHTML = SECCIONES.map(([n, t, sub]) => {
      const cs = vis.filter((c) => c.nivel === n);
      if (!cs.length) return "";
      const plegada = n === "D" && !st.verD && !st.q && st.filtro === "todas";
      return `<section class="seccion" id="sec-${n}">
        <div class="seccion-cab"><h2>${t} · ${cs.length}</h2><p>${sub}</p></div>
        ${plegada ? `<button class="btn btn-contorno" id="btn-ver-d">Ver las ${cs.length}</button>` : `<div class="lista">${cs.map(tarjeta).join("")}</div>`}
      </section>`;
    }).join("") || `<div class="vacio">Ninguna candidata coincide con este filtro.</div>`;
    anchos($("main"));
    const cuenta = vis.length === st.lista.length ? `${st.lista.length} candidatas` : `${vis.length} de ${st.lista.length} candidatas`;
    const fav = Object.values(st.marcas).filter((m) => m.estado === "favorita").length;
    $("#resumen-filtro").textContent = `${cuenta}${fav ? ` · ${fav} marcadas con “Me gusta”` : ""}`;
  }

  function pintarChips() {
    const ch = [["todas", "Todas"], ["favorita", "★ Me gusta"], ["contactada", "Contactadas"], ["entrevista", "Entrevista"], ["contratada", "Contratadas"], ["descartada", "Descartadas por ustedes"], ["repetidas", "Llenaron más de una vez"], ["recientes", "Recientes"]];
    $("#chips-estado").innerHTML = ch.map(([k, t]) => `<button class="chip ${st.filtro === k ? "activo" : ""}" data-filtro="${k}">${t}</button>`).join("");
  }

  // Los anchos se ponen desde aquí: la política de seguridad bloquea estilos escritos en el HTML
  function anchos(raiz = document) { $$("[data-w]", raiz).forEach((e) => { e.style.width = `${e.dataset.w}%`; }); }
  function pintarTodo() { pintarMensaje(); pintarPodio(); pintarChips(); pintarLista(); piezas(); pintarBandeja(); }

  function pintarMensaje() {
    const ops = MENSAJES[st.puesto] || MENSAJES.domestica;
    const [clave, nombre] = opcionMensaje(st.puesto);
    const texto = textoMensaje(st.puesto, clave);
    const editado = (st.mensajes || []).some((m) => m.puesto === st.puesto && m.clave === clave);
    $("#mensaje-bar").innerHTML = `
      <div class="mensaje-cab"><span class="mensaje-t">Mensaje de WhatsApp</span><span class="mensaje-sub">Se precarga en todas las candidatas de ${esc(P().nombre.toLowerCase())}</span></div>
      <div class="mensaje-ops" role="radiogroup" aria-label="Mensaje de WhatsApp">${ops.map(([k, n]) => `<button type="button" role="radio" aria-checked="${k === clave}" class="chip ${k === clave ? "activo" : ""}" data-mensaje="${k}">${esc(n)}</button>`).join("")}</div>
      <p class="mensaje-vista">«${esc(texto.replace(/\{nombre\}/g, "María"))}»</p>
      <div class="mensaje-pie"><button type="button" class="btn btn-contorno btn-chico" id="btn-editar-mensaje">Editar «${esc(nombre)}»</button>${editado ? `<span class="quien">Editado para su casa</span>` : ""}</div>`;
  }
  function editarMensaje() {
    const [clave, nombre] = opcionMensaje(st.puesto);
    $("#msg-titulo").textContent = `Editar «${nombre}» · ${P().nombre}`;
    $("#msg-texto").value = textoMensaje(st.puesto, clave);
    $("#dlg-mensaje").showModal();
  }
  async function guardarTexto(restaurar) {
    const [clave] = opcionMensaje(st.puesto);
    const texto = restaurar ? "" : $("#msg-texto").value.trim();
    if (!restaurar && !texto) { aviso("Escribe el mensaje o pica Restaurar"); return; }
    try {
      await api("/api/mensaje", { puesto: st.puesto, clave, texto });
      st.mensajes = (st.mensajes || []).filter((m) => !(m.puesto === st.puesto && m.clave === clave));
      if (texto) st.mensajes.push({ puesto: st.puesto, clave, texto });
      $("#dlg-mensaje").close();
      repintar();
      aviso(restaurar ? "Mensaje original restaurado" : "Mensaje guardado para toda su casa");
    } catch { aviso("No se guardó. Revisa tu conexión."); }
  }

  /* ─── RLR · comparar finalistas lado a lado ─── */
  function pintarBandeja() {
    const ids = st.comparar[st.puesto] || [];
    const b = $("#bandeja");
    if (!ids.length) { b.classList.add("oculto"); return; }
    b.classList.remove("oculto");
    b.innerHTML = `<div class="bandeja-in">
      <span class="bandeja-t">Comparar</span>
      ${ids.map((id) => st.porId[id]).filter(Boolean).map((c) => `<span class="bandeja-c">${esc(primer(c.nombre))}<button type="button" data-quitar="${c.id}" aria-label="Quitar a ${esc(c.nombre)}">×</button></span>`).join("")}
      <button class="btn btn-verde btn-chico" id="btn-ver-comparar" ${ids.length < 2 ? "disabled" : ""}>${ids.length < 2 ? "Elige otra" : `Comparar ${ids.length}`}</button>
    </div>`;
  }
  function alternarComparar(id) {
    const c = st.porId[id]; if (!c) return;
    const lista = st.comparar[c.puesto] = st.comparar[c.puesto] || [];
    const i = lista.indexOf(id);
    if (i >= 0) lista.splice(i, 1);
    else if (lista.length >= 3) { aviso("Puedes comparar hasta tres"); return; }
    else lista.push(id);
    $$(`[data-comparar="${id}"]`).forEach((b) => {
      const dentro = lista.includes(id);
      b.classList.toggle("activo", dentro); b.setAttribute("aria-pressed", dentro);
      b.textContent = dentro ? "✓ En comparación" : "⇆ Comparar";
    });
    pintarBandeja();
  }
  function vistaComparar() {
    const cs = (st.comparar[st.puesto] || []).map((id) => st.porId[id]).filter(Boolean);
    const guia = st.puesto === "guia";
    const mejor = Math.max(...cs.map((c) => c.puntos || 0));
    const fila = (titulo, f, cls = "") => `<div class="cmp-fila ${cls}"><div class="cmp-t">${titulo}</div>${cs.map((c) => `<div class="cmp-c">${f(c)}</div>`).join("")}</div>`;
    const med = (nombre, k, max) => {
      const top = Math.max(...cs.map((c) => c[k] || 0));
      return fila(nombre, (c) => `<div class="cmp-med ${(c[k] || 0) === top ? "top" : ""}"><span class="m-barra"><i data-w="${Math.round(((c[k] || 0) / max) * 100)}"></i></span><b>${c[k] ?? 0}/${max}</b></div>`);
    };
    const ult = (c) => { const e = c.envios_detalle || []; return e[c.destacado ?? -1] || e[e.length - 1] || c; };
    return `
    <div class="fc-hero"><div class="fc-hero-in">
      <div class="fc-nav"><button class="btn btn-contorno-claro" data-cerrar-ficha>← <span>Volver a la lista</span></button><span class="fc-pos">${P().nombre}</span><button class="btn btn-verde btn-chico" data-pdf="comparar">⬇ <span>PDF</span></button></div>
      <div class="eyebrow">Lado a lado</div>
      <h1 class="cmp-h1">Comparar ${cs.length} finalistas</h1>
      <p class="hero-sub">Lo más fuerte de cada una aparece marcado en verde. La de mayor puntaje lleva la corona.</p>
    </div></div>
    <div class="cmp-envoltura"><div class="cmp" data-cols="${cs.length}">
      <div class="cmp-fila cmp-cab"><div class="cmp-t"></div>${cs.map((c) => `<div class="cmp-c">
        <div class="cmp-lugar">${c.puntos === mejor ? "👑 " : ""}Lugar #${c.lugar ?? "—"}</div>
        <h2>${esc(c.nombre)}</h2>
        <span class="veredicto v-${c.nivel}">${veredicto(c).corto}</span>
        <div class="cmp-puntos tab">${c.puntos ?? "—"}<small>/100</small></div>
        <div class="cmp-acciones">${waBoton(c, "btn-verde btn-chico", `${ICONO_WA}WhatsApp`)}<button class="btn btn-contorno btn-chico" data-abrir="${c.id}">Ver ficha</button></div>
      </div>`).join("")}</div>
      ${PC(cs[0] || {}).medidores.map(([n, k, max]) => med(n, k, max)).join("")}
      ${fila("Datos", (c) => [c.edad ? `${c.edad} años` : "", esc(c.colonia), guia ? "" : esc(c.experiencia)].filter(Boolean).join("<br>") || "—")}
      ${fila("Por qué está aquí", (c) => esc(c.resumen || "—"))}
      ${fila("Lo que la hace brillar", (c) => esc(c.a_favor || "—"), "bien")}
      ${fila("Lo que hay que confirmar", (c) => esc(c.a_cuidar || "—"), "ojo")}
      ${fila("Pregunta para la llamada", (c) => esc(c.preguntar || "—"))}
      ${guia
        ? fila("Experiencia real con niños", (c) => `«${esc(ult(c).exp_ninos || "—")}»`) + fila("Si la niña se frustra", (c) => `«${esc(ult(c).frustracion || "—")}»`)
        : fila("Por qué es la mejor", (c) => `«${esc(ult(c).porque || "—")}»`) + fila("Lo primero que limpia", (c) => `«${esc(ult(c).limpia || "—")}»`) + fila("Lo que cocina", (c) => esc(ult(c).comidas || "—"))}
      ${fila("Referida por", (c) => esc(c.referido || "—"))}
      ${fila("Decisión de la casa", (c) => marcasHTML(c), "fila-decision")}
    </div></div>`;
  }

  /* ─── RLR · contratar: piezas que se apagan de arriba hacia abajo ─── */
  const SEL_PIEZAS = ".ficha > *:not(.marcas), .t-fila > *, .t-acciones > *:not(.marcas), .fc-hero-in > *, .fc-top > * > *, .fc-marcador, .fc-col > .panel, .fc-lado > .panel:not(.decision), .decision > *:not(.marcas)";
  function piezas(raiz = document) {
    $$(".contratada, .ficha-completa", raiz).forEach((cont) => {
      const lista = $$(SEL_PIEZAS, cont).filter((e) => !e.closest(".marcas"));
      lista.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((e, i) => { e.classList.add("pz"); e.style.setProperty("--i", Math.min(i, 24)); });
    });
  }
  function contenedores(id) {
    const f = $("#ficha");
    const lista = $$(`.tarjeta[data-id="${id}"], .ficha[data-id="${id}"]`);
    if (!f.classList.contains("oculto")) lista.push(f);
    return lista;
  }
  function animar(id, tipo) {
    contenedores(id).forEach((el) => {
      piezas(el.parentElement || document);
      $$(SEL_PIEZAS, el).forEach((e) => e.classList.add("pz"));
      const orden = $$(".pz", el).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      orden.forEach((e, i) => e.style.setProperty("--i", Math.min(i, 24)));
      el.classList.remove("animar-contratar", "animar-liberar"); void el.offsetWidth;
      el.classList.add(tipo === "contratar" ? "animar-contratar" : "animar-liberar");
      setTimeout(() => el.classList.remove("animar-contratar", "animar-liberar"), 2600);
    });
  }
  function confeti(x, y) {
    const colores = ["#56EF9F", "#ffffff", "#2A89FB", "#2BC878", "#c9ffe2"];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i");
      p.className = "confeti";
      const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 190;
      p.style.setProperty("--x", `${x}px`); p.style.setProperty("--y", `${y}px`);
      p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`); p.style.setProperty("--dy", `${Math.sin(ang) * dist - 80}px`);
      p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`); p.style.setProperty("--c", colores[i % colores.length]);
      p.style.setProperty("--d", `${Math.random() * 120}ms`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1700);
    }
  }
  function repintar() {
    const y = window.scrollY; pintarTodo(); window.scrollTo(0, y);
    if (!$("#ficha").classList.contains("oculto")) { const s = $("#ficha").scrollTop; ruta(); $("#ficha").scrollTop = s; }
  }
  async function compartirFicha(id) {
    const c = st.porId[id]; const caja = $(`#compartir-${id}`);
    try {
      const d = await api("/api/compartir", { id });
      const msg = `Te comparto la ficha de ${c.nombre}, candidata a ${PC(c).nombre.toLowerCase()}: ${d.url}`;
      if (navigator.share) { try { await navigator.share({ title: c.nombre, text: msg }); } catch { /* canceló */ } }
      caja.innerHTML = `<div class="liga-copia"><input id="liga-${id}" readonly value="${esc(d.url)}" aria-label="Enlace para compartir"><button class="btn btn-navy btn-chico" data-copiar="liga-${id}">Copiar</button></div>
        <a class="btn btn-navy btn-chico" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ICONO_WA}Mandar por WhatsApp</a>
        <small>Solo muestra esta ficha. Vence el ${fecha(d.expira)}.</small>`;
    } catch { aviso("No se pudo crear el enlace"); }
  }
  /* ─── RLR · descargar PDF de la ficha o del comparativo ─── */
  const H2P = { src: "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js", sri: "sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc" };
  function cargarH2P() {
    if (window.html2pdf) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = H2P.src; s.integrity = H2P.sri; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
      s.onload = ok; s.onerror = mal; document.head.appendChild(s);
    });
  }
  // Nombre de archivo: título + fecha y hora hasta el minuto (sin caracteres que rompan en Mac o Windows)
  function nombreArchivo(titulo) {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    const limpio = titulo.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
    return `${limpio} · ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}h${p(d.getMinutes())}.pdf`;
  }
  let haciendoPDF = false;
  async function descargarPDF(tipo, id) {
    if (haciendoPDF) return;
    haciendoPDF = true;
    aviso("Preparando el PDF…");
    const hoja = document.createElement("div");
    hoja.className = "pdf-hoja";
    let titulo, horizontal = false;
    if (tipo === "ficha") {
      const c = st.porId[id];
      hoja.innerHTML = fichaCompleta(c);
      titulo = `Ficha · ${c.nombre} · ${PC(c).nombre}`;
    } else {
      const cs = (st.comparar[st.puesto] || []).map((x) => st.porId[x]).filter(Boolean);
      hoja.innerHTML = vistaComparar();
      titulo = `Comparativo · ${cs.map((c) => primer(c.nombre)).join(", ")} · ${P().nombre}`;
      horizontal = cs.length > 2;
    }
    const ahora = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
    hoja.insertAdjacentHTML("beforeend", `<p class="pdf-pie">Talento · documento privado · generado por ${esc(st.yo.nombre)} el ${esc(ahora)}</p>`);
    // La librería copia la hoja a su propio espacio; basta con armarla sin pegarla a la página
    const anchoPx = 1180;
    hoja.style.width = `${anchoPx}px`;
    $$("details", hoja).forEach((d) => d.setAttribute("open", ""));
    anchos(hoja);
    // Página del ancho exacto del diseño (a 96 ppp), con proporción de hoja A4
    const margen = 6;
    const anchoMm = anchoPx * 25.4 / 96 + margen * 2;
    const altoMm = horizontal ? anchoMm / 1.414 : anchoMm * 1.414;
    try {
      await cargarH2P();
      await document.fonts.ready;
      await window.html2pdf().set({
        margin: [margen, margen, margen + 2, margen],
        filename: nombreArchivo(titulo),
        image: { type: "jpeg", quality: 0.94 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#F4F7FF", x: 0, y: 0, scrollX: 0, scrollY: 0, width: anchoPx, windowWidth: anchoPx },
        jsPDF: { unit: "mm", format: [anchoMm, altoMm], orientation: horizontal ? "landscape" : "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".panel", ".cmp-fila", ".caja", ".pregunta", ".fc-marcador", ".cita"] },
      }).from(hoja).save();
      aviso("PDF descargado");
    } catch {
      aviso("No se pudo crear el PDF. Intenta de nuevo.");
    } finally {
      haciendoPDF = false;
    }
  }
  let porContratar = null;
  function pedirContratar(id, x, y) {
    const c = st.porId[id]; if (!c) return;
    porContratar = { id, x, y };
    $("#contratar-nombre").textContent = c.nombre;
    $("#contratar-puesto").textContent = PC(c).nombre.toLowerCase();
    $("#btn-si-contratar").textContent = `Sí, contratar a ${primer(c.nombre)}`;
    $("#dlg-contratar").showModal();
  }
  async function contratar() {
    const { id, x, y } = porContratar || {}; if (!id) return;
    $("#dlg-contratar").close();
    try {
      await guardarMarca(id, "contratada");
      repintar();
      requestAnimationFrame(() => { animar(id, "contratar"); confeti(x, y); });
      aviso(`¡${st.porId[id].nombre} contratada!`);
    } catch { aviso("No se guardó. Revisa tu conexión."); }
    porContratar = null;
  }
  async function liberar(id) {
    try {
      await guardarMarca(id, "");
      repintar();
      requestAnimationFrame(() => animar(id, "liberar"));
      aviso(`${st.porId[id].nombre} vuelve a estar disponible`);
    } catch { aviso("No se guardó. Revisa tu conexión."); }
  }

  /* ─── ficha completa ─── */
  function qaLista(e, puesto) {
    const filas = puesto === "guia" ? [
      ["Cómo organizaría una tarde de 4 horas", e.tarde], ["Qué hace si la niña se frustra o llora", e.frustracion],
      ["Qué significa acompañar su desarrollo", e.desarrollo], ["Una experiencia real con niños pequeños", e.exp_ninos],
      ["Qué es ser confiable dentro de un hogar", e.confianza], ["Referida por", e.referido], ["Colonia", e.colonia],
    ] : [
      ["¿Se queda a dormir de lunes a jueves?", e.dormir], ["¿Entra lunes 8–9 y sale viernes 5–7?", e.horario],
      ["Años en casas particulares", e.experiencia], ["¿Le gusta convivir con niños de 4 años?", e.ninos],
      ["¿Tranquila y respetuosa en casa ajena?", e.tranquila], ["Tres comidas que cocina muy bien", e.comidas],
      ["Lo primero que limpia y por qué", e.limpia], ["Por qué es la mejor para el puesto", e.porque],
      ["Referida por", e.referido], ["Colonia", e.colonia],
    ];
    return `<dl class="qa-lista">${filas.map(([p, r]) => `<div class="qa"><dt>${p}</dt><dd>${esc(r || "—")}</dd></div>`).join("")}</dl>`;
  }

  function platillos(txt) {
    const partes = String(txt || "").split(/\n|,|;|\/|\s-\s|(?:^|\s)-(?=\S)/).map((s) => s.trim().replace(/^[-–•\s]+|[.\s]+$/g, "")).filter((s) => s.length > 1);
    if (partes.length <= 1) return `<p class="cita-texto">${esc(txt || "—")}</p>`;
    return `<div class="platillos">${partes.slice(0, 12).map((p) => `<span class="platillo">${esc(p[0].toUpperCase() + p.slice(1))}</span>`).join("")}</div>`;
  }

  function cvs(txt) {
    const ligas = String(txt || "").split(/[,\s]+/).filter((u) => /^https:\/\/services\.leadconnectorhq\.com\//.test(u));
    if (!ligas.length) return "";
    return `<div class="cita-titulo">Currículum</div><div class="t-acciones">${ligas.map((u, i) => `<a class="btn btn-navy btn-chico" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Ver CV${ligas.length > 1 ? ` ${i + 1}` : ""}</a>`).join("")}</div>`;
  }
  function check(ok, titulo, sub) {
    const si = String(ok || "").toLowerCase().startsWith("s");
    return `<div class="check ${si ? "si" : "no"}"><i aria-hidden="true">${si ? "✓" : "✕"}</i><div>${titulo}<small>${si ? "Sí" : "No"}${sub ? ` · ${sub}` : ""}</small></div></div>`;
  }

  function fichaCompleta(c) {
    const v = veredicto(c);
    const i = st.lista.indexOf(c);
    const ant = st.lista[i - 1], sig = st.lista[i + 1];
    const m = st.marcas[c.id] || {};
    const envios = c.envios_detalle || [];
    const d = envios[c.destacado ?? -1] || envios[envios.length - 1] || c;
    const otraSol = c.destacado != null && c.destacado !== envios.length - 1;
    const top = c.lugar && c.lugar <= 3 ? `Es la ${LUGARES[c.lugar - 1]} opción de las ${st.total}.` : "";
    return `
    <div class="fc-hero"><div class="fc-hero-in">
      <div class="fc-nav">
        <button class="btn btn-contorno-claro" data-cerrar-ficha>← <span>Volver a la lista</span></button>
        ${ant ? `<button class="btn btn-contorno-claro" data-abrir="${ant.id}" aria-label="Anterior">‹ <span>Anterior</span></button>` : ""}
        ${sig ? `<button class="btn btn-contorno-claro" data-abrir="${sig.id}" aria-label="Siguiente"><span>Siguiente</span> ›</button>` : ""}
        <span class="fc-pos">${c.lugar ? `Lugar ${c.lugar} de ${st.total}` : "Nueva"}</span>
        <button class="btn btn-verde btn-chico" data-pdf="ficha" data-id="${c.id}">⬇ <span>PDF</span></button>
      </div>
      <div class="fc-top">
        <div>
          <div class="fc-lugar"><span class="num">${c.lugar ? `Lugar #${c.lugar}` : "Nueva"}</span><span class="veredicto v-${c.nivel}">${v.largo}</span><span class="insignia fuerte">${PC(c).nombre}</span></div>
          <h1 id="fc-nombre">${esc(c.nombre)}</h1>
          <div class="fc-meta">
            ${c.edad ? `<span>${c.edad} años</span>` : ""}
            ${c.colonia ? `<span>${esc(c.colonia)}</span>` : ""}
            ${c.experiencia ? `<span>${esc(c.experiencia)} en casas</span>` : ""}
            <span>${c.envios > 1 ? `Llenó ${c.envios} veces · última ${fecha(c.ultimo_envio)}` : `Llenó el ${fecha(c.ultimo_envio)}`} · ${hace(c.ultimo_envio)}</span>
          </div>
          <div class="fc-contacto">
            ${waBoton(c, "btn-verde", `${ICONO_WA}WhatsApp ${tel(c.celular)}`)}
            <a class="btn btn-contorno-claro" href="tel:+52${c.celular}">${ICONO_TEL}Llamar</a>
            ${c.tel_extra ? `<a class="btn btn-contorno-claro" href="tel:+52${c.tel_extra}">${ICONO_TEL}Otro número ${tel(c.tel_extra)}</a>` : ""}
            ${botonComparar(c, true)}
          </div>
        </div>
        <div class="fc-marcador">
          <div class="fc-marcador-cab"><span>Calificación</span><div class="puntaje-num tab">${c.puntos ?? "—"}<small>/100</small></div></div>
          ${medidores(c)}
        </div>
      </div>
    </div></div>

    <div class="fc-cuerpo">
      <div class="fc-col">
        <section class="panel">
          <h2>Nuestra lectura</h2>
          <p class="lectura-veredicto">${v.frase} ${top}</p>
          <p class="lectura-lead">${esc(c.resumen || "—")}</p>
          <div class="dos">
            <div class="caja caja-bien"><h3>Lo que la hace brillar</h3><p>${esc(c.a_favor || "—")}</p></div>
            <div class="caja caja-ojo"><h3>Lo que hay que confirmar</h3><p>${esc(c.a_cuidar || "—")}</p></div>
          </div>
          ${c.preguntar ? `<div class="pregunta">${ICONO_PREG}<div><b>Pregunta para la primera llamada</b><p>${esc(c.preguntar)}</p></div></div>` : ""}
        </section>

        <section class="panel">
          <h2>En sus palabras</h2>
          <p class="sub">Lo que ella escribió${c.envios > 1 ? (otraSol ? ` en su solicitud del ${fecha(d.fecha)}, la que mejor la representa` : " en su solicitud más reciente") : " en su solicitud"}, tal cual.</p>
          ${c.puesto === "guia" ? `
          <div class="cita-titulo">Una experiencia real con niños pequeños</div>
          <blockquote class="cita"><p>«${esc(d.exp_ninos || "—")}»</p></blockquote>
          <div class="cita-titulo">Si la niña se frustra o llora</div>
          <blockquote class="cita"><p>«${esc(d.frustracion || "—")}»</p></blockquote>
          <div class="cita-titulo">Cómo organizaría una tarde de 4 horas</div>
          <blockquote class="cita"><p>«${esc(d.tarde || "—")}»</p></blockquote>
          <div class="cita-titulo">Qué es ser confiable dentro de un hogar</div>
          <blockquote class="cita"><p>«${esc(d.confianza || "—")}»</p></blockquote>
          ${cvs(d.cv)}` : `
          <div class="cita-titulo">Por qué cree que es la mejor para el puesto</div>
          <blockquote class="cita"><p>«${esc(d.porque || "—")}»</p></blockquote>
          <div class="cita-titulo">Lo primero que limpia al llegar, y por qué</div>
          <blockquote class="cita"><p>«${esc(d.limpia || "—")}»</p></blockquote>
          <div class="cita-titulo">Lo que cocina muy bien</div>
          ${platillos(d.comidas)}`}
        </section>

        ${c.puesto === "guia" ? "" : `<section class="panel">
          <h2>El arreglo de la casa</h2>
          <p class="sub">Lo que contestó sobre el horario y la convivencia.</p>
          <div class="checks">
            ${check(c.dormir, "Se queda a dormir de lunes a jueves")}
            ${check(c.horario, "Entra lunes 8 a 9, sale viernes 5 a 7")}
            ${check(c.ninos, "Le gusta convivir con una niña de 4 años")}
            ${check(c.tranquila, "Se considera tranquila y respetuosa")}
          </div>
        </section>`}

        ${envios.length > 1 ? `<section class="panel">
          <h2>Sus ${envios.length} solicitudes</h2>
          <p class="sub">Llenó el formulario más de una vez. Aquí está cada envío completo.</p>
          <div class="lineatiempo">${envios.slice().reverse().map((e, k) => `
            <details class="lt-envio" ${k === 0 ? "open" : ""}><summary>Solicitud del ${fecha(e.fecha)}<span>${e.fecha ? e.fecha.slice(11, 16) + " h" : ""}</span></summary>${qaLista(e, c.puesto)}</details>`).join("")}
          </div></section>` : `<section class="panel"><h2>Su solicitud completa</h2><p class="sub">Todas sus respuestas.</p>${qaLista(envios[0] || c, c.puesto)}</section>`}
      </div>

      <aside class="fc-lado">
        <section class="panel decision">
          <h2>Decisión de la casa</h2>
          <p class="sub">Lo que marquen aquí lo ve toda su casa.</p>
          ${marcasHTML(c)}
          <div class="nota"><label for="nota-${c.id}">Notas de la llamada</label>
            <textarea id="nota-${c.id}" data-nota="${c.id}" placeholder="Ej. Contestó rápido, puede empezar el lunes…">${esc(m.nota || "")}</textarea>
            <small id="nota-estado-${c.id}">${m.nota && m.cuando ? `Guardado ${fecha(m.cuando)}` : "Se guarda solo"}</small></div>
          <div class="compartir-caja" id="compartir-${c.id}">
            <button class="btn btn-contorno btn-chico" data-compartir="${c.id}">Compartir esta ficha</button>
            <small>Crea un enlace privado solo de ella, sin acceso al tablero. Vence en 7 días.</small>
          </div>
        </section>
        <section class="panel">
          <h2>Datos</h2>
          <div class="datos-lista">
            <div class="dato"><span>Celular y WhatsApp</span>${noDisponible(c) ? `<span class="apagado">${tel(c.celular)} · contratada</span>` : `<a href="${wa(c)}" target="_blank" rel="noopener">${tel(c.celular)}</a>`}</div>
            ${c.tel_extra ? `<div class="dato"><span>Otro número</span>${noDisponible(c) ? `<span class="apagado">${tel(c.tel_extra)}</span>` : `<a href="${wa(c, c.tel_extra)}" target="_blank" rel="noopener">${tel(c.tel_extra)}</a>`}</div>` : ""}
            <div class="dato"><span>Correo</span>${esc(c.correo || "—")}</div>
            <div class="dato"><span>Edad</span>${c.edad ? `${c.edad} años · nació el ${fecha(c.nacimiento)}` : "No la dio"}</div>
            <div class="dato"><span>Colonia</span>${esc(c.colonia || "—")}</div>
            <div class="dato"><span>Referida por</span>${esc(c.referido || "—")}</div>
            <div class="dato"><span>Evaluación</span>${c.evaluo === "claude-auto" ? "Automática con Claude" : c.evaluo === "claude-revision" ? "Revisada una por una" : "Pendiente"}</div>
          </div>
        </section>
      </aside>
    </div>`;
  }

  function ruta() {
    const m = location.hash.match(/^#\/c\/((?:[a-z]+-)?\d{10})$/);
    const f = $("#ficha");
    if (location.hash === "#/comparar") {
      if ((st.comparar[st.puesto] || []).length < 2) { history.replaceState(null, "", location.pathname); }
      else {
        f.innerHTML = vistaComparar(); f.classList.remove("contratada");
        f.classList.remove("oculto"); f.scrollTop = 0; anchos(f);
        document.body.classList.add("con-ficha"); document.title = "Comparar · Talento";
        return;
      }
    }
    const c = m && st.porId[m[1]];
    if (c && c.puesto !== st.puesto) usarPuesto(c.puesto);
    if (!c) { f.classList.add("oculto"); f.innerHTML = ""; document.body.classList.remove("con-ficha"); return; }
    f.innerHTML = fichaCompleta(c);
    f.classList.toggle("contratada", noDisponible(c));
    f.classList.remove("oculto"); f.scrollTop = 0; anchos(f); piezas();
    document.body.classList.add("con-ficha");
    const b = $("[data-cerrar-ficha]", f); if (b) b.focus({ preventScroll: true });
    document.title = `${c.nombre} · Talento`;
  }
  // Abrir una ficha desde la lista agrega un paso al historial, así el botón de regresar del celular la cierra.
  // Pasar a la anterior o siguiente reemplaza ese paso para no llenar el historial.
  function irA(hash) {
    const abierta = !$("#ficha").classList.contains("oculto");
    if (abierta && history.state && history.state.talento) history.replaceState({ talento: true }, "", hash);
    else history.pushState({ talento: true }, "", hash);
    ruta();
  }
  function abrir(id) { irA(`#/c/${id}`); }
  function cerrarFicha() {
    document.title = "Talento · Casa";
    if (history.state && history.state.talento) { history.back(); return; }
    history.replaceState(null, "", location.pathname);
    ruta();
  }

  /* ─── marcar y notas ─── */
  async function guardarMarca(id, estado, nota) {
    const previo = st.marcas[id] || {};
    const cuerpo = { id, estado: estado ?? previo.estado ?? "", nota: nota ?? previo.nota ?? "" };
    const d = await api("/api/marca", cuerpo);
    st.marcas[id] = d.marca;
    return d.marca;
  }
  const tNota = {};

  /* ─── importar CSV (solo Ricardo) ─── */
  function parseCSV(t) {
    const filas = []; let fila = [], campo = "", q = false;
    t = t.replace(/^﻿/, "");
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { fila.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && t[i + 1] === "\n") i++;
        fila.push(campo); filas.push(fila); fila = []; campo = "";
      } else campo += ch;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((x) => x.trim()));
  }
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const MES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function fechaCSV(s) {
    s = String(s || "").trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 19);
    const m = s.match(/^([A-Za-z]{3})\w*\s+(\d{1,2})\w*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!m) return "";
    let h = Number(m[4]) % 12; if (m[6].toLowerCase() === "pm") h += 12;
    const p = (n) => String(n).padStart(2, "0");
    return `${m[3]}-${p(MES[m[1].toLowerCase()])}-${p(m[2])}T${p(h)}:${m[5]}:00`;
  }
  function filasDe(texto) {
    const t = parseCSV(texto); if (t.length < 2) return [];
    const cab = t[0].map(norm);
    const col = (...pruebas) => cab.findIndex((h) => pruebas.some((p) => (p instanceof RegExp ? p.test(h) : h === p)));
    const ix = {
      nombre: col("nombre (s)", "first name"), apellido: col("apellido paterno y materno", "last name"),
      celular: col("celular personal", "phone"), correo: col("correo", "email"), tel_extra: col("telefono extra"),
      nacimiento: col(/fecha de nacimiento/), referido: col("referido por"), fecha: col("submission date", "created"),
      colonia: col(/colonia/), dormir: col(/dormir/), horario: col(/puedes entrar/), experiencia: col(/cuantos anos/),
      ninos: col(/ninos pequenos/), tranquila: col(/tranquila/), comidas: col(/comidas/), limpia: col(/primero que limpias/),
      porque: col(/mejor persona/),
      tarde: col(/tarde ideal/), frustracion: col(/frustracion/), desarrollo: col(/desarrollo infantil/),
      exp_ninos: col(/experiencia real con ninos/), confianza: col(/confianza dentro/), cv: col(/curri/),
    };
    if (ix.celular < 0 || (ix.limpia < 0 && ix.tarde < 0)) return [];
    const v = (f, k) => (ix[k] >= 0 ? String(f[ix[k]] || "").replace(/^="?|"$/g, "").trim() : "");
    return t.slice(1).map((f) => ({
      nombre: `${v(f, "nombre")} ${v(f, "apellido")}`.trim(), celular: v(f, "celular"), correo: v(f, "correo"),
      tel_extra: v(f, "tel_extra"), nacimiento: v(f, "nacimiento"), referido: v(f, "referido"), fecha: fechaCSV(v(f, "fecha")),
      colonia: v(f, "colonia"), dormir: v(f, "dormir"), horario: v(f, "horario"), experiencia: v(f, "experiencia"),
      ninos: v(f, "ninos"), tranquila: v(f, "tranquila"), comidas: v(f, "comidas"), limpia: v(f, "limpia"), porque: v(f, "porque"),
      tarde: v(f, "tarde"), frustracion: v(f, "frustracion"), desarrollo: v(f, "desarrollo"), exp_ninos: v(f, "exp_ninos"),
      confianza: v(f, "confianza"), cv: v(f, "cv"),
    })).filter((r) => r.celular);
  }
  async function importar(archivos) {
    let filas = [];
    for (const a of archivos) filas = filas.concat(filasDe(await a.text()));
    if (!filas.length) { aviso("Ese archivo no parece un export del formulario"); return; }
    // formulario primero (trae fechas), luego contactos
    filas.sort((a, b) => (b.fecha ? 1 : 0) - (a.fecha ? 1 : 0) || String(a.fecha).localeCompare(String(b.fecha)));
    aviso(`Subiendo ${filas.length} filas como ${P().nombre}…`);
    const tot = { nuevas: 0, volvieron: 0, sinCambio: 0 };
    for (let i = 0; i < filas.length; i += 200) {
      const r = await api("/api/importar", { filas: filas.slice(i, i + 200), puesto: st.puesto });
      tot.nuevas += r.nuevas; tot.volvieron += r.volvieron; tot.sinCambio += r.sinCambio;
    }
    aviso(`${tot.nuevas} nuevas · ${tot.volvieron} volvieron a llenar · ${tot.sinCambio} sin cambios`);
    await cargar();
    if (tot.nuevas + tot.volvieron) await evaluar(false);
  }
  let evaluando = false;
  async function evaluar(reintentar) {
    if (evaluando) return; evaluando = true;
    try {
      let r = await api("/api/evaluar", { reintentar });
      let hechas = 0;
      while (r.evaluada) {
        hechas++; aviso(`Claude evaluó a ${r.nombre}${r.ok ? "" : ` (falló: ${r.error})`} · quedan ${r.quedan}`);
        if (!r.quedan) break;
        r = await api("/api/evaluar", {});
      }
      if (hechas) await cargar(); else aviso("No hay candidatas pendientes");
    } catch { aviso("No se pudo evaluar. Intenta de nuevo."); }
    evaluando = false;
  }

  /* ─── tamaño de letra ─── */
  function escala(delta) {
    let e = 1; try { e = Number(localStorage.getItem("casa-escala")) || 1; } catch {}
    e = Math.min(1.4, Math.max(.9, Math.round((e + delta) * 10) / 10));
    document.documentElement.style.setProperty("--escala", e);
    try { localStorage.setItem("casa-escala", e); } catch {}
    return e;
  }

  /* ─── eventos ─── */
  document.addEventListener("click", async (ev) => {
    const t = ev.target;
    const bMsg = t.closest("[data-mensaje]");
    if (bMsg) {
      guardar(`talento-mensaje-${st.puesto}`, bMsg.dataset.mensaje);
      repintar();
      aviso(`WhatsApp con mensaje «${opcionMensaje(st.puesto)[1]}»`);
      return;
    }
    if (t.id === "btn-editar-mensaje") { editarMensaje(); return; }
    if (t.id === "btn-msg-guardar") { guardarTexto(false); return; }
    if (t.id === "btn-msg-restaurar") { guardarTexto(true); return; }
    const bPdf = t.closest("[data-pdf]");
    if (bPdf) { descargarPDF(bPdf.dataset.pdf, bPdf.dataset.id); return; }
    const bComp = t.closest("[data-compartir]");
    if (bComp) { compartirFicha(bComp.dataset.compartir); return; }
    if (t.dataset && t.dataset.copiar) {
      const inp = $(`#${t.dataset.copiar}`);
      try { await navigator.clipboard.writeText(inp.value); aviso("Enlace copiado"); } catch { inp.select(); document.execCommand("copy"); aviso("Enlace copiado"); }
      return;
    }
    const bCmp = t.closest("[data-comparar]");
    if (bCmp) { ev.stopPropagation(); alternarComparar(bCmp.dataset.comparar); return; }
    const bQuitar = t.closest("[data-quitar]");
    if (bQuitar) { alternarComparar(bQuitar.dataset.quitar); if (location.hash === "#/comparar") ruta(); return; }
    if (t.id === "btn-ver-comparar") { irA("#/comparar"); return; }
    const bNo = t.closest("[data-accion='no-contratar']");
    if (bNo) { ev.stopPropagation(); liberar(bNo.closest(".marcas").dataset.id); return; }
    if (t.id === "btn-si-contratar") { contratar(); return; }
    const bMarca = t.closest(".marcas button[data-estado]");
    if (bMarca) {
      ev.stopPropagation();
      const id = bMarca.closest(".marcas").dataset.id;
      if (bMarca.dataset.estado === "contratada") {
        const r = bMarca.getBoundingClientRect();
        pedirContratar(id, r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
      const actual = (st.marcas[id] || {}).estado;
      const nuevo = actual === bMarca.dataset.estado ? "" : bMarca.dataset.estado;
      try {
        await guardarMarca(id, nuevo);
        aviso(nuevo ? `Marcada: ${ESTADOS.find((e) => e[0] === nuevo)[1].replace("★ ", "")}` : "Marca quitada");
        const y = window.scrollY; pintarTodo(); window.scrollTo(0, y);
        if (!$("#ficha").classList.contains("oculto")) { const s = $("#ficha").scrollTop; ruta(); $("#ficha").scrollTop = s; }
      } catch { aviso("No se guardó. Revisa tu conexión."); }
      return;
    }
    if (t.closest("a")) return; // WhatsApp y teléfono abren solos
    const bAbrir = t.closest("[data-abrir]");
    if (bAbrir) { abrir(bAbrir.dataset.abrir); return; }
    if (t.closest("[data-cerrar-ficha]")) { cerrarFicha(); return; }
    const card = t.closest(".tarjeta, .ficha");
    if (card && !t.closest("button")) { abrir(card.dataset.id); return; }
    const bPuesto = t.closest("[data-puesto]");
    if (bPuesto && bPuesto.classList.contains("puesto")) { usarPuesto(bPuesto.dataset.puesto); return; }
    const chip = t.closest("[data-filtro]");
    if (chip) { st.filtro = chip.dataset.filtro; pintarChips(); pintarLista(); return; }
    if (t.id === "btn-ver-d") { st.verD = true; pintarLista(); return; }
    if (t.id === "btn-evaluar") { evaluar(true); return; }
    if (t.closest("[data-cerrar]")) { t.closest("dialog").close(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#ficha").classList.contains("oculto")) cerrarFicha();
    if (e.key === "Enter" && e.target.classList && e.target.classList.contains("tarjeta")) abrir(e.target.dataset.id);
  });
  document.addEventListener("input", (e) => {
    const id = e.target.dataset && e.target.dataset.nota;
    if (!id) return;
    const est = $(`#nota-estado-${id}`); if (est) est.textContent = "Escribiendo…";
    clearTimeout(tNota[id]);
    tNota[id] = setTimeout(async () => {
      try { await guardarMarca(id, undefined, e.target.value); if (est) est.textContent = "Guardado ✓"; }
      catch { if (est) est.textContent = "No se guardó"; }
    }, 800);
  });
  let tBuscar;
  $("#buscar").addEventListener("input", (e) => {
    clearTimeout(tBuscar);
    tBuscar = setTimeout(() => { st.q = norm(e.target.value); pintarLista(); }, 180);
  });
  window.addEventListener("hashchange", ruta);
  window.addEventListener("popstate", ruta);
  $("#tam-mas").addEventListener("click", () => { aviso(`Letra al ${Math.round(escala(.1) * 100)} %`); requestAnimationFrame(medirBarra); });
  $("#tam-menos").addEventListener("click", () => { aviso(`Letra al ${Math.round(escala(-.1) * 100)} %`); requestAnimationFrame(medirBarra); });
  $("#btn-como").addEventListener("click", () => $("#dlg-como").showModal());
  $("#btn-como-movil").addEventListener("click", () => $("#dlg-como").showModal());
  // Tocar fuera de una ventana la cierra
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
  // La barra de filtros se pega justo debajo de la barra de arriba, mida lo que mida
  function medirBarra() { document.documentElement.style.setProperty("--barra", `${Math.round($(".barra").getBoundingClientRect().height)}px`); }
  medirBarra(); window.addEventListener("resize", medirBarra);
  $("#btn-salir").addEventListener("click", async () => {
    ponerLlave("");
    try { await fetch(API + "/api/salir", { method: "POST" }); } catch { /* sin conexión */ }
    location.replace(ENTRADA);
  });
  $("#btn-agregar").addEventListener("click", () => $("#archivo").click());
  $("#archivo").addEventListener("change", (e) => { if (e.target.files.length) importar([...e.target.files]); e.target.value = ""; });
  $("#btn-bitacora").addEventListener("click", async () => {
    const d = await api("/api/bitacora");
    $("#bitacora-lista").innerHTML = `<table>${d.bitacora.map((b) => `<tr><td>${esc(nombreDe(b.quien))}</td><td>${esc(b.accion)}</td><td>${new Date(b.cuando).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td><td>${esc(b.accion === "entró" ? b.detalle : "")}</td></tr>`).join("") || "<tr><td>Sin registros</td></tr>"}</table>`;
    $("#dlg-bitacora").showModal();
  });

  escala(0);
  cargar().catch(() => {});
})();
/* fin · RLR · Ricardo López Reyero */
