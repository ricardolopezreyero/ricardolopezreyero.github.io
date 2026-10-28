/* ─────────────────────────────────────────────────────────────
 *  RLR · Talento · reclutamiento de la casa · núcleo del tablero
 *  Autor: Ricardo López Reyero · build eye · rev 181218
 *  Candidatas, ficha completa, comparar, marcas, importar y contacto.
 *  Las pantallas de embudo, analítica y puestos viven en pantallas.js.
 * ───────────────────────────────────────────────────────────── */
(() => {
  const _RLR = "Ricardo López Reyero";
  const _k = "EYE", _rev = 181218; // candado de autoría

  // RLR · la pantalla puede vivir en GitHub Pages o en el Worker; la API siempre está en el Worker
  const EN_PAGES = location.hostname.endsWith("github.io");
  const API = EN_PAGES ? "https://talento.noisy-shape-4fc9.workers.dev" : "";
  const ENTRADA = EN_PAGES ? "entrar.html" : "/";
  const leerLlave = () => { try { return localStorage.getItem("talento-llave") || ""; } catch { return ""; } };
  const ponerLlave = (v) => { try { v ? localStorage.setItem("talento-llave", v) : localStorage.removeItem("talento-llave"); } catch { /* sin almacenamiento */ } };
  if (EN_PAGES && !leerLlave()) location.replace(ENTRADA);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const st = {
    puestos: [], porPuesto: {}, puesto: "domestica", comparar: {}, nombres: {}, ocupadas: new Set(), yo: null,
    todas: [], lista: [], porId: {}, marcas: {}, eventos: [], sincronizaciones: [], crm: null,
    q: "", filtro: "todas", vista: "tarjetas", verD: false, total: 0, pantalla: "tablero",
  };

  /* ─── utilidades ─── */
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fecha(iso) {
    if (!iso) return "—";
    if (/Z$|[+-]\d{2}:\d{2}$/.test(iso)) { const t = new Date(iso); return `${t.getDate()} ${MESES[t.getMonth()]} ${t.getFullYear()}`; }
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${y}`;
  }
  const dias = (iso) => (iso ? Math.floor((Date.now() - new Date(iso.slice(0, 19))) / 86400000) : null);
  function hace(iso) {
    if (!iso) return "";
    const d = dias(iso);
    if (d < 1) return "hoy";
    if (d < 14) return `hace ${d} días`;
    if (d < 60) return `hace ${Math.round(d / 7)} semanas`;
    return `hace ${Math.round(d / 30)} meses`;
  }
  const reciente = (c) => c.ultimo_envio && dias(c.ultimo_envio) <= 60;
  const tel = (t) => (t && t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t || "—");
  const primer = (n) => String(n || "").split(" ").find((w) => w.length > 2 && !/^ma\.?$/i.test(w)) || n;
  const iniciales = (n) => String(n || "").split(" ").filter((w) => w.length > 2 && !/\.$/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const guardado = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
  // RLR · privacidad: con el interruptor encendido se difuminan apellidos, teléfonos y correos (quedan primer nombre, colonia y edad)
  const sens = (t) => `<span class="privado">${esc(t)}</span>`;
  const priv = (t) => esc(t).replace(/(?:\+?52\s?)?\b\d(?:[\d\s().-]{8,}\d)\b/g, (m) => `<span class="privado">${m}</span>`).replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (m) => `<span class="privado">${m}</span>`);
  function nombreHTML(n) {
    const w = String(n || "").trim().split(/\s+/).filter(Boolean);
    if (w.length < 2) return esc(n);
    const p = primer(n); let i = w.indexOf(p); if (i < 0) i = 0;
    return `${esc(w.slice(0, i + 1).join(" "))} <span class="privado">${esc(w.slice(i + 1).join(" "))}</span>`;
  }
  const telHTML = (t) => sens(tel(t));
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

  /* ─── puestos (vienen del servidor) ─── */
  const P = () => st.porPuesto[st.puesto] || st.puestos[0] || { id: "domestica", nombre: "Empleado doméstico", corto: "Planta", preguntas: [], rubrica: { medidores: [] }, mensajes: [] };
  const PC = (c) => st.porPuesto[c.puesto] || P();
  const TITULOS = { domestica: "Quién debería entrar a <em>la casa</em>", guia: "Quién debería ser <em>la guía Montessori</em>", finde: "Quién debería cuidar <em>el fin de semana</em>", masajista: "Quién debería dar <em>los masajes</em>" };
  const tituloDe = (p) => TITULOS[p.id] || `Quién debería ser <em>${esc(String(p.nombre).toLowerCase())}</em>`;
  const medidoresDe = (p) => (p.rubrica && p.rubrica.medidores) || [];

  /* RLR · mensajes de WhatsApp: tres opciones por puesto, editables para toda la casa */
  function opcionMensaje(puesto) {
    const ops = (st.porPuesto[puesto] || P()).mensajes || [];
    const k = guardado(`talento-mensaje-${puesto}`, ops[0] ? ops[0][0] : "generico");
    return ops.find((o) => o[0] === k) || ops[0] || ["generico", "Genérico", "Hola {nombre}, buen día. Le escribo por su solicitud. ¿Sigue disponible?"];
  }
  function textoMensaje(puesto, clave) {
    const propio = (st.mensajes || []).find((m) => m.puesto === puesto && m.clave === clave);
    if (propio) return propio.texto;
    const o = ((st.porPuesto[puesto] || P()).mensajes || []).find((x) => x[0] === clave);
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
    if (c.nivel === "D" && c.descartada) { v.largo = "No acepta el arreglo"; v.frase = "No cumple el arreglo del puesto."; }
    if (c.evaluo === "pendiente" && c.nivel !== "P") v.corto += " · volvió a llenar";
    return v;
  }
  const LUGARES = ["primera", "segunda", "tercera"];

  // RLR · etapas del embudo, iguales para todo puesto. «Me gusta» es una marca aparte.
  const ETAPAS = [["", "Nuevas"], ["contactada", "Contactadas"], ["entrevista", "Entrevista"], ["prueba", "Prueba"], ["contratada", "Contratadas"]];
  const ETAPA_NOMBRE = { "": "Nueva", contactada: "Contactada", entrevista: "Entrevista", prueba: "Prueba", contratada: "Contratada", descartada: "Descartada" };
  const ESTADOS = [["contactada", "Contactada"], ["entrevista", "Entrevista"], ["prueba", "Prueba"], ["contratada", "Contratada"], ["descartada", "Descartar"]];

  function medidores(c) {
    if (c.puntos == null) return `<div class="m-nombre sin">Sin calificación todavía</div>`;
    const m = medidoresDe(PC(c)).map(([n, k, max]) => [n, c[k], max]);
    const aj = [];
    if (c.p_intensidad) aj.push(`<span class="insignia">+${c.p_intensidad} volvió a llenar</span>`);
    if (c.p_riesgo) aj.push(`<span class="insignia">−${c.p_riesgo} por riesgo</span>`);
    return `<div class="medidores">${m.map(([n, v, max]) => `
      <div class="medidor" title="${esc(n)}: ${v ?? 0} de ${max}"><span class="m-nombre">${esc(n)}</span>
      <span class="m-barra"><i data-w="${Math.round(((v || 0) / max) * 100)}"></i></span>
      <span class="m-num">${v ?? 0}/${max}</span></div>`).join("")}
      ${aj.length ? `<div class="ajustes">${aj.join("")}</div>` : ""}</div>`;
  }

  function insignias(c) {
    const out = [];
    out.push(etiquetasHTML(c));
    out.push(`<span class="insignia fuerte">${esc(PC(c).corto || PC(c).nombre)}</span>`);
    if (c.edad) out.push(`<span class="insignia">${c.edad} años</span>`);
    if (c.experiencia && c.experiencia.length < 30) out.push(`<span class="insignia">${esc(c.experiencia)}${/año/.test(c.experiencia) ? "" : " de experiencia"}</span>`);
    if (c.envios > 1) out.push(`<span class="insignia fuerte">Llenó ${c.envios} veces</span>`);
    if (reciente(c)) out.push(`<span class="insignia">Reciente</span>`);
    return out.join("");
  }

  // RLR · etiquetas de la casa: «Más lista» y «Más empática», dos por categoría y por puesto (solo con 100 o más candidatas)
  const ETQ = { lista: ["Más lista", "🧠"], empatica: ["Más empática", "💛"] };
  const etiquetasDe = (c) => (st.etiquetas || []).filter((e) => e.id === c.id && e.puesto === c.puesto);
  function etiquetasHTML(c, chicas = false) {
    return etiquetasDe(c).map((e) => `<span class="etq etq-${e.etiqueta} ${chicas ? "chica" : ""}" title="${esc(e.motivo || "")}">${ETQ[e.etiqueta][1]} ${ETQ[e.etiqueta][0]} ${e.orden || 1}</span>`).join("");
  }
  // RLR · sondeo de disponibilidad: un clic y la candidata recibe un correo con dos botones; la secuencia se repite hasta que conteste
  const sondeoDe = (c) => { const l = (st.sondeos || []).filter((x) => x.id === c.id); return l[l.length - 1] || null; };
  const correoValido = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x || "") && !/notengo|no tengo|sin correo/i.test(x);
  function sondeoHTML(c, largo = false) {
    const s = sondeoDe(c);
    if (s && s.respuesta) return `<span class="sondeo-pill ${s.respuesta === "si" ? "si" : "no"}" title="Contestó el ${fecha(s.respondido)} por ${s.canal === "sms" ? "SMS" : "correo"}">${s.respuesta === "si" ? "💚 Dijo que sí está abierta" : "🙏 Dijo que por ahora no"}${largo ? ` · ${fecha(s.respondido)}` : ""}</span>${largo && s.respuesta === "si" ? `<small class="quien">Le prometimos que le escribirías por WhatsApp.</small>` : ""}`;
    if (s && s.siguiente) {
      const cuando = new Date(s.siguiente), hoy = new Date();
      const mismoDia = cuando.toDateString() === hoy.toDateString();
      const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
      const etq = `${mismoDia ? "hoy" : cuando.toDateString() === manana.toDateString() ? "mañana" : fecha(cuando.toISOString())} ${cuando.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}`;
      return `<span class="sondeo-pill espera" title="Toques enviados: ${s.paso} de 4. Los avisos solo salen de lunes a sábado de 9 a 19.">✉ Preguntada ${hace(s.creado)} · ${s.paso < 4 ? `aviso ${s.paso + 1} ${etq}` : "último aviso enviado"}</span>${largo ? `<small class="quien">${s.envios.map((e) => `${e.canal === "sms" ? "SMS" : "Correo"} ${e.paso}${e.error ? ` falló (${esc(e.error)})` : e.estado ? ` ${esc(e.estado)}` : " ✓"}`).join(" · ")}</small>` : ""}`;
    }
    if (s) return `<span class="sondeo-pill no">Sin respuesta tras 4 avisos</span>${largo ? `<button type="button" class="btn btn-contorno btn-chico" data-sondeo="${c.id}">Volver a preguntar</button>` : ""}`;
    if (!correoValido(c.correo)) return largo ? `<small class="quien">No dejó correo: por ahora el sondeo solo va por correo.</small>` : "";
    return `<button type="button" class="btn btn-contorno btn-chico" data-sondeo="${c.id}" title="Le llega un correo con dos botones: «Sí, estoy abierta» y «Por ahora no». Si no contesta, se repite a la hora, a las 12 y a las 24.">✉ ¿Está abierta a trabajar?</button>`;
  }
  const marcaDe = (c) => st.marcas[c.id] || {};
  const etapaDe = (c) => marcaDe(c).estado || "";
  const esContratada = (c) => etapaDe(c) === "contratada";
  const esOcupada = (c) => !esContratada(c) && st.ocupadas && st.ocupadas.has(c.id);
  const noDisponible = (c) => esContratada(c) || esOcupada(c);
  const nombreDe = (rol) => (st.nombres && st.nombres[rol]) || rol || "";
  function waBoton(c, clases, contenido) {
    if (noDisponible(c)) return `<span class="btn ${clases} btn-apagado" aria-disabled="true" title="Ya está contratada">${contenido}</span>`;
    return `<a class="btn ${clases}" href="${wa(c)}" target="_blank" rel="noopener">${contenido}</a>`;
  }
  function botonComparar(c, oscuro) {
    const dentro = (st.comparar[c.puesto] || []).includes(c.id);
    return `<button type="button" class="btn-comparar ${oscuro ? "oscuro" : ""} ${dentro ? "activo" : ""}" data-comparar="${c.id}" aria-pressed="${dentro}">${dentro ? "✓ En comparación" : "⇆ Comparar"}</button>`;
  }
  function etapaPastilla(c) {
    const e = etapaDe(c);
    if (!e) return "";
    return `<span class="etapa-pastilla e-${e}">${ETAPA_NOMBRE[e]}</span>`;
  }
  function marcasHTML(c) {
    const m = marcaDe(c);
    const quien = m.cuando && (m.estado || m.favorita) ? `<span class="quien">${esc(nombreDe(m.quien))} · ${fecha(m.cuando)}</span>` : "";
    const fav = `<button type="button" data-favorita="${c.id}" class="${m.favorita ? "activo" : ""}" aria-pressed="${Boolean(m.favorita)}" title="Me gusta">★${m.favorita ? " Me gusta" : ""}</button>`;
    if (esOcupada(c)) return `<div class="marcas marcas-contratada" data-id="${c.id}"><span class="sello">Contratada en otra casa</span></div>`;
    if (m.estado === "contratada") {
      return `<div class="marcas marcas-contratada" data-id="${c.id}"><span class="sello">✓ Contratada</span><button type="button" class="no-contratar" data-accion="no-contratar">No contratar</button>${quien}</div>`;
    }
    return `<div class="marcas" data-id="${c.id}">${fav}${ESTADOS.map(([k, t]) => `<button type="button" data-estado="${k}" class="${m.estado === k ? "activo" : ""}" aria-pressed="${m.estado === k}">${t}</button>`).join("")}${quien}</div>`;
  }

  /* ─── avisos ─── */
  let tAviso;
  function aviso(t, ms = 3000) {
    const a = $("#aviso"); $("span", a).textContent = t; a.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("ver"), ms);
  }

  /* ─── API ─── */
  async function api(ruta, cuerpo) {
    const llave = leerLlave();
    const headers = { ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(llave ? { Authorization: `Bearer ${llave}` } : {}) };
    const r = await fetch(API + ruta, cuerpo ? { method: "POST", headers, body: JSON.stringify(cuerpo) } : { headers });
    if (r.status === 401) { ponerLlave(""); location.replace(ENTRADA); throw new Error("sesion"); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || "error"); e.datos = d; throw e; }
    return d;
  }

  async function cargar() {
    const d = await api("/api/candidatas");
    st.yo = d.yo; st.nombres = d.nombres || {}; st.ocupadas = new Set(d.ocupadas || []); st.mensajes = d.mensajes || [];
    st.marcas = d.marcas || {}; st.eventos = d.eventos || []; st.sincronizaciones = d.sincronizaciones || []; st.crm = d.crm || null;
    st.etiquetas = d.etiquetas || [];
    st.sondeos = d.sondeos || [];
    st.deliberaciones = d.deliberaciones || [];
    st.puestos = (d.puestos || []).filter((p) => p.activo !== 0 || st.yo.admin);
    st.porPuesto = Object.fromEntries((d.puestos || []).map((p) => [p.id, p]));
    for (const p of st.puestos) st.comparar[p.id] = st.comparar[p.id] || [];
    const lugares = {};
    st.todas = d.candidatas.map((c) => {
      const p = c.puesto || "domestica";
      lugares[p] = lugares[p] || 0;
      return { ...c, puesto: p, lugar: c.nivel === "P" ? null : ++lugares[p] };
    });
    st.porId = Object.fromEntries(st.todas.map((c) => [c.id, c]));
    if (!st.porPuesto[st.puesto]) st.puesto = st.puestos[0] ? st.puestos[0].id : "domestica";
    usarPuesto(st.puesto, false);
    $("#saludo").textContent = `Hola, ${d.yo.nombre}`;
    $("#saludo-movil").textContent = `Hola, ${d.yo.nombre}`;
    $("#yo-inicial").textContent = (d.yo.nombre || "?")[0].toUpperCase();
    $("#yo-nombre").textContent = d.yo.nombre;
    $("#yo-casa").textContent = d.yo.admin ? "Administra la casa" : "Casa";
    $$(".admin").forEach((e) => e.classList.toggle("oculto", !d.yo.admin));
    cuentasMenu();
    pintarPantalla();
    ruta();
  }
  function cuentasMenu() {
    $("#n-candidatas").textContent = st.todas.length;
    const enProceso = st.todas.filter((c) => ["contactada", "entrevista", "prueba"].includes(etapaDe(c))).length;
    $("#n-proceso").textContent = enProceso || "";
    $("#n-puestos").textContent = st.puestos.filter((p) => p.activo !== 0).length;
  }

  function usarPuesto(p, pintar = true) {
    st.puesto = st.porPuesto[p] ? p : st.puesto;
    st.lista = st.todas.filter((c) => c.puesto === st.puesto);
    st.total = st.lista.filter((c) => c.nivel !== "P").length;
    st.filtro = "todas"; st.verD = false;
    guardar("talento-puesto", st.puesto);
    if (pintar) { pintarPantalla(); window.scrollTo(0, 0); }
  }
  function selectorPuestos(conTodos = false) {
    const activos = st.puestos.filter((p) => p.activo !== 0);
    return `<nav class="puestos" aria-label="Puesto">${conTodos ? `<button class="puesto todos ${st.puesto === "*" ? "activo" : ""}" data-puesto="*" aria-pressed="${st.puesto === "*"}">Todos los puestos<b>${st.todas.length}</b></button>` : ""}${activos.map((p) => {
      const n = st.todas.filter((c) => c.puesto === p.id).length;
      return `<button class="puesto ${p.id === st.puesto ? "activo" : ""}" data-puesto="${p.id}" aria-pressed="${p.id === st.puesto}">${esc(p.nombre)}<b>${n}</b></button>`;
    }).join("")}</nav>`;
  }

  /* ─── pantalla: candidatas ─── */
  function pintarTablero() {
    const v = $("#vista");
    if (st.puesto === "*" || !st.porPuesto[st.puesto]) usarPuesto(st.puestos[0] ? st.puestos[0].id : "domestica", false);
    v.innerHTML = `
      ${selectorPuestos()}
      <section class="cab"><div><div class="eyebrow">Las tres mejores · ${esc(P().nombre)}</div><h1 id="hero-titulo">${tituloDe(P())}</h1><p class="sub" id="hero-sub"></p></div>
        <div class="cab-acciones">${st.yo.admin ? `<button class="btn btn-contorno btn-chico" id="btn-sync" title="Trae lo nuevo del CRM">↻ Traer del CRM</button><button class="btn btn-contorno btn-chico" id="btn-agregar">Agregar CSV</button>` : ""}</div></section>
      <div class="podio" id="podio"></div>
      <div class="mensaje-linea" id="mensaje-linea"></div>
      <div class="herramientas">
        <input class="buscar" id="buscar" type="search" placeholder="Buscar por nombre, colonia o palabra…" autocomplete="off" enterkeyhint="search" value="${esc(st.qTexto || "")}">
        <div class="chips" id="chips-estado"></div>
        <div class="resumen-filtro"><span id="resumen-filtro"></span><div class="vistas" role="group" aria-label="Vista"><button data-vista="tarjetas" class="${st.vista === "tarjetas" ? "activo" : ""}">Tarjetas</button><button data-vista="tabla" class="${st.vista === "tabla" ? "activo" : ""}">Tabla</button></div></div>
      </div>
      <div id="pendientes"></div>
      <div id="secciones"></div>`;
    pintarPodio(); pintarMensajeLinea(); pintarChips(); pintarLista(); piezas(); pintarBandeja();
  }

  function pintarPodio() {
    // Las tres mejores del lote: las de «llamar primero» y, si no las hay, las mejores que haya (la lista ya viene ordenada)
    const buenas = st.lista.filter((c) => c.nivel === "A").length;
    const tres = st.lista.filter((c) => c.nivel !== "P" && !c.descartada && c.nivel !== "D").slice(0, 3);
    const n = st.total, extra = Math.max(0, buenas - 3);
    const pend = st.lista.filter((c) => c.nivel === "P").length;
    const frase = !tres.length ? "" : buenas ? ` Estas ${tres.length === 1 ? "es la que" : "son las que"} yo llamaría primero.` : ` Ninguna llega a «llamar primero» con esta rúbrica; estas son las ${tres.length === 1 ? "mejor" : "mejores"} del lote y valen la llamada.`;
    $("#hero-sub").textContent = n ? `${n} candidatas ordenadas de mejor a peor.${frase}${extra ? ` Otras ${extra} también valen la llamada.` : ""}${pend ? ` Hay ${pend} nuevas por evaluar.` : ""}` : pend ? `${pend} candidatas nuevas por evaluar.` : "Todavía no llegan candidatas a este puesto.";
    $("#podio").innerHTML = tres.map((c, i) => `
      <article class="ficha ${noDisponible(c) ? "contratada" : ""}" data-id="${c.id}">
        <div class="ficha-lugar"><b>${i + 1}</b><span>${LUGARES[i]} opción · ${c.puntos} puntos</span></div>
        <div>
          <h2>${nombreHTML(c.nombre)}</h2>
          ${etiquetasDe(c).length ? `<div class="insignias">${etiquetasHTML(c)}</div>` : ""}
          <div class="ficha-meta">${[c.edad ? `${c.edad} años` : "", esc(c.colonia), c.experiencia && c.experiencia.length < 30 ? esc(c.experiencia) : ""].filter(Boolean).join(" · ")}</div>
        </div>
        <div class="ficha-tel tab">${telHTML(c.celular)}<small>Celular y WhatsApp${c.tel_extra ? ` · otro: ${telHTML(c.tel_extra)}` : ""}</small></div>
        <div class="ficha-acciones">
          ${waBoton(c, "btn-verde", `${ICONO_WA}WhatsApp`)}
          <button class="btn btn-contorno" data-abrir="${c.id}">Ver ficha completa</button>
        </div>
        <div><h3>Por qué es la ${LUGARES[i]}</h3><p>${priv(c.resumen)}</p></div>
        ${c.a_favor ? `<div><h3>Lo que la hace brillar</h3><p class="tenue">${priv(c.a_favor)}</p></div>` : ""}
        ${marcasHTML(c)}
        ${noDisponible(c) ? "" : `<div>${sondeoHTML(c)}</div>`}
      </article>`).join("") || "";
    $("#podio").classList.toggle("oculto", !tres.length);
  }
  function pintarMensajeLinea() {
    const [, nombre] = opcionMensaje(st.puesto);
    const el = $("#mensaje-linea"); if (!el) return;
    el.innerHTML = `Mensaje de WhatsApp: <b>${esc(nombre)}</b> <button type="button" data-ir="mensajes">cambiar</button>`;
  }

  /* ─── lista ─── */
  function pasaFiltro(c) {
    const m = marcaDe(c);
    const f = st.filtro;
    if (f === "favorita") { if (!m.favorita) return false; }
    else if (f === "lista" || f === "empatica") { if (!etiquetasDe(c).some((e) => e.etiqueta === f)) return false; }
    else if (f === "nueva") { if (m.estado) return false; }
    else if (["contactada", "entrevista", "prueba", "contratada", "descartada"].includes(f)) { if (m.estado !== f) return false; }
    else if (f === "repetidas") { if (!(c.envios > 1)) return false; }
    else if (f === "recientes") { if (!reciente(c)) return false; }
    if (st.q) {
      const t = [c.nombre, c.colonia, c.comidas, c.limpia, c.porque, c.resumen, c.referido, c.celular, m.nota, c.a_favor].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!st.q.split(/\s+/).every((p) => t.includes(p))) return false;
    }
    return true;
  }

  function tarjeta(c) {
    const v = veredicto(c);
    const m = marcaDe(c);
    return `
    <article class="tarjeta ${m.estado === "descartada" ? "marcada-descartada" : ""} ${noDisponible(c) ? "contratada" : ""}" data-id="${c.id}" tabindex="0" aria-label="Ver ficha de ${esc(c.nombre)}">
      <div class="t-fila">
        <div class="avatar n${c.nivel}">${esc(iniciales(c.nombre))}${c.lugar ? `<b>${c.lugar}</b>` : ""}</div>
        <div>
          <div class="t-cab"><h3 class="t-nombre">${nombreHTML(c.nombre)}</h3><span class="veredicto v-${c.nivel}">${v.corto}</span>${etapaPastilla(c)}</div>
          <div class="t-meta">${[esc(c.colonia), `Llenó ${fecha(c.ultimo_envio)} · ${hace(c.ultimo_envio)}`].filter(Boolean).join(" · ")}</div>
          <div class="insignias">${insignias(c)}</div>
          <p class="t-res">${priv(c.resumen || "—")}</p>
        </div>
        <div class="puntaje"><div class="puntaje-num tab">${c.puntos ?? "—"}<small>/100</small></div>${medidores(c)}</div>
      </div>
      <div class="t-acciones">
        ${waBoton(c, "btn-navy btn-chico", `${ICONO_WA}WhatsApp`)}
        <a class="btn btn-fantasma btn-chico" href="tel:+52${c.celular}">${ICONO_TEL}${telHTML(c.celular)}</a>
        ${marcasHTML(c)}
        ${noDisponible(c) ? "" : sondeoHTML(c)}
        ${botonComparar(c)}
        <span class="t-ver">Ver ficha completa →</span>
      </div>
    </article>`;
  }

  const SECCIONES = [
    ["A", "Llamar primero", "Las que yo metería a la casa. Empieza por aquí."],
    ["B", "Buenas opciones", "Vale la pena una llamada si las primeras no están disponibles."],
    ["C", "Con reservas", "Pueden servir, pero hay dudas importantes."],
    ["D", "No las recomendamos", "No aceptan el arreglo, o sus respuestas no dan confianza. Aquí están por si acaso."],
  ];

  function filaTabla(c) {
    const m = marcaDe(c);
    return `<tr class="fila ${m.estado === "descartada" ? "apagada" : ""}" data-id="${c.id}" tabindex="0">
      <td class="derecha tab">${c.lugar ?? "—"}</td>
      <td class="nombre-celda">${m.favorita ? "★ " : ""}${nombreHTML(c.nombre)} ${etiquetasHTML(c, true)}</td>
      <td class="derecha tab"><b>${c.puntos ?? "—"}</b></td>
      <td><span class="veredicto v-${c.nivel}">${veredicto(c).corto}</span></td>
      <td>${etapaPastilla(c) || `<span class="etapa-pastilla">Nueva</span>`}</td>
      <td>${esc(c.colonia || "—")}</td>
      <td>${c.edad ? `${c.edad}` : "—"}</td>
      <td>${esc(c.experiencia && c.experiencia.length < 30 ? c.experiencia : "—")}</td>
      <td class="tab">${fecha(c.ultimo_envio)}${c.envios > 1 ? ` · ×${c.envios}` : ""}</td>
      <td>${waBoton(c, "btn-navy btn-chico", `${ICONO_WA}`)}</td>
    </tr>`;
  }

  function pintarLista() {
    const vis = st.lista.filter(pasaFiltro);
    const pend = vis.filter((c) => c.nivel === "P");
    $("#pendientes").innerHTML = pend.length ? `
      <section class="seccion"><div class="seccion-cab"><h2>Nuevas por evaluar · ${pend.length}</h2>
      <p>Llegaron en la última sincronización o archivo.</p>
      ${st.yo.admin ? `<button class="btn btn-navy btn-chico" id="btn-evaluar">Evaluar ahora</button>` : ""}</div>
      ${st.vista === "tabla" ? `<div class="tabla-env"><table class="tabla"><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Lectura</th><th>Etapa</th><th>Colonia</th><th>Edad</th><th>Experiencia</th><th>Llenó</th><th></th></tr></thead><tbody>${pend.map(filaTabla).join("")}</tbody></table></div>` : `<div class="lista">${pend.map(tarjeta).join("")}</div>`}</section>` : "";
    if (st.vista === "tabla") {
      const cs = vis.filter((c) => c.nivel !== "P");
      $("#secciones").innerHTML = cs.length ? `<section class="seccion"><div class="tabla-env"><table class="tabla"><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Lectura</th><th>Etapa</th><th>Colonia</th><th>Edad</th><th>Experiencia</th><th>Llenó</th><th></th></tr></thead><tbody>${cs.map(filaTabla).join("")}</tbody></table></div></section>` : (pend.length ? "" : `<div class="vacio">Ninguna candidata coincide con este filtro.</div>`);
    } else {
      $("#secciones").innerHTML = SECCIONES.map(([n, t, sub]) => {
        const cs = vis.filter((c) => c.nivel === n);
        if (!cs.length) return "";
        const plegada = n === "D" && !st.verD && !st.q && st.filtro === "todas";
        return `<section class="seccion" id="sec-${n}">
          <div class="seccion-cab"><h2>${t} · ${cs.length}</h2><p>${sub}</p></div>
          ${plegada ? `<button class="btn btn-contorno" id="btn-ver-d">Ver las ${cs.length}</button>` : `<div class="lista">${cs.map(tarjeta).join("")}</div>`}
        </section>`;
      }).join("") || (pend.length ? "" : `<div class="vacio">Ninguna candidata coincide con este filtro.</div>`);
    }
    anchos($("#vista"));
    const cuenta = vis.length === st.lista.length ? `${st.lista.length} candidatas` : `${vis.length} de ${st.lista.length} candidatas`;
    const fav = st.lista.filter((c) => marcaDe(c).favorita).length;
    $("#resumen-filtro").textContent = `${cuenta}${fav ? ` · ${fav} con “Me gusta”` : ""}`;
  }

  function pintarChips() {
    const n = (f) => st.lista.filter((c) => { const g = st.filtro; st.filtro = f; const ok = pasaFiltro(c); st.filtro = g; return ok; }).length;
    const ch = [["todas", "Todas"], ["favorita", "★ Me gusta"], ["lista", "🧠 Más listas"], ["empatica", "💛 Más empáticas"], ["nueva", "Sin contactar"], ["contactada", "Contactadas"], ["entrevista", "Entrevista"], ["prueba", "Prueba"], ["contratada", "Contratadas"], ["descartada", "Descartadas"], ["repetidas", "Llenaron más de una vez"], ["recientes", "Recientes"]];
    $("#chips-estado").innerHTML = ch.map(([k, t]) => { const c = k === "todas" ? 0 : n(k); return (k === "todas" || c) ? `<button class="chip ${st.filtro === k ? "activo" : ""}" data-filtro="${k}">${t}${c ? ` · ${c}` : ""}</button>` : ""; }).join("");
  }

  // Los anchos se ponen desde aquí: la política de seguridad bloquea estilos escritos en el HTML
  function anchos(raiz = document) { $$("[data-w]", raiz).forEach((e) => { e.style.width = `${e.dataset.w}%`; }); }

  /* ─── mensajes de WhatsApp (edición) ─── */
  function editarMensaje(puesto = st.puesto) {
    const [clave, nombre] = opcionMensaje(puesto);
    $("#msg-titulo").textContent = `Editar «${nombre}» · ${(st.porPuesto[puesto] || P()).nombre}`;
    $("#msg-texto").value = textoMensaje(puesto, clave);
    $("#dlg-mensaje").dataset.puesto = puesto;
    $("#dlg-mensaje").showModal();
  }
  async function guardarTexto(restaurar) {
    const puesto = $("#dlg-mensaje").dataset.puesto || st.puesto;
    const [clave] = opcionMensaje(puesto);
    const texto = restaurar ? "" : $("#msg-texto").value.trim();
    if (!restaurar && !texto) { aviso("Escribe el mensaje o pica Restaurar"); return; }
    try {
      await api("/api/mensaje", { puesto, clave, texto });
      st.mensajes = (st.mensajes || []).filter((m) => !(m.puesto === puesto && m.clave === clave));
      if (texto) st.mensajes.push({ puesto, clave, texto });
      $("#dlg-mensaje").close();
      repintar();
      aviso(restaurar ? "Mensaje original restaurado" : "Mensaje guardado para toda su casa");
    } catch { aviso("No se guardó. Revisa tu conexión."); }
  }

  /* ─── RLR · comparar finalistas lado a lado ─── */
  function pintarBandeja() {
    const ids = st.comparar[st.puesto] || [];
    const b = $("#bandeja");
    if (!ids.length || st.puesto === "*") { b.classList.add("oculto"); return; }
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
  const ultimoEnvio = (c) => { const e = c.envios_detalle || []; return e[c.destacado ?? -1] || e[e.length - 1] || c; };
  function vistaComparar() {
    const cs = (st.comparar[st.puesto] || []).map((id) => st.porId[id]).filter(Boolean);
    const p = P();
    const mejor = Math.max(...cs.map((c) => c.puntos || 0));
    const fila = (titulo, f, cls = "") => `<div class="cmp-fila ${cls}"><div class="cmp-t">${titulo}</div>${cs.map((c) => `<div class="cmp-c">${f(c)}</div>`).join("")}</div>`;
    const med = (nombre, k, max) => {
      const top = Math.max(...cs.map((c) => c[k] || 0));
      return fila(esc(nombre), (c) => `<div class="cmp-med ${(c[k] || 0) === top ? "top" : ""}"><span class="m-barra"><i data-w="${Math.round(((c[k] || 0) / max) * 100)}"></i></span><b>${c[k] ?? 0}/${max}</b></div>`);
    };
    const citas = ((p.rubrica && p.rubrica.citas) || []).slice(0, 3);
    return `
    <div class="fc-hero"><div class="fc-hero-in">
      <div class="fc-nav"><button class="btn btn-contorno-claro" data-cerrar-ficha>← <span>Volver</span><span class="solo-escritorio"> a la lista</span></button><span class="fc-pos">${esc(p.nombre)}</span><button class="btn btn-contorno-claro btn-chico" data-pdf="comparar">⬇ <span>PDF</span></button></div>
      <div class="eyebrow">Lado a lado</div>
      <h1 class="cmp-h1">Comparar ${cs.length} finalistas</h1>
      <p class="hero-sub">Lo más fuerte de cada una aparece marcado en verde. La de mayor puntaje lleva la corona.</p>
    </div></div>
    <div class="cmp-envoltura"><div class="cmp" data-cols="${cs.length}">
      <div class="cmp-fila cmp-cab"><div class="cmp-t"></div>${cs.map((c) => `<div class="cmp-c">
        <div class="cmp-lugar">${c.puntos === mejor ? "👑 " : ""}Lugar #${c.lugar ?? "—"}</div>
        <h2>${nombreHTML(c.nombre)}</h2>
        <span class="veredicto v-${c.nivel}">${veredicto(c).corto}</span>
        <div class="cmp-puntos tab">${c.puntos ?? "—"}<small>/100</small></div>
        <div class="cmp-acciones">${waBoton(c, "btn-verde btn-chico", `${ICONO_WA}WhatsApp`)}<button class="btn btn-contorno btn-chico" data-abrir="${c.id}">Ver ficha</button></div>
      </div>`).join("")}</div>
      ${medidoresDe(p).map(([n, k, max]) => med(n, k, max)).join("")}
      ${fila("Datos", (c) => [c.edad ? `${c.edad} años` : "", esc(c.colonia), c.experiencia && c.experiencia.length < 30 ? esc(c.experiencia) : ""].filter(Boolean).join("<br>") || "—")}
      ${fila("Por qué está aquí", (c) => priv(c.resumen || "—"))}
      ${fila("Lo que la hace brillar", (c) => priv(c.a_favor || "—"), "bien")}
      ${fila("Lo que hay que confirmar", (c) => priv(c.a_cuidar || "—"), "ojo")}
      ${fila("Pregunta para la llamada", (c) => priv(c.preguntar || "—"))}
      ${citas.map(([k, t]) => fila(esc(t), (c) => `«${priv(ultimoEnvio(c)[k] || "—")}»`)).join("")}
      ${p.rubrica && p.rubrica.platillos ? fila("Lo que cocina", (c) => esc(ultimoEnvio(c)[p.rubrica.platillos] || "—")) : ""}
      ${fila("Referida por", (c) => priv(c.referido || "—"))}
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
    const colores = ["#56EF9F", "#0039C8", "#2A89FB", "#2BC878", "#c9ffe2"];
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
    const y = window.scrollY; cuentasMenu(); pintarPantalla(); window.scrollTo(0, y);
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
    const anchoPx = 1180;
    hoja.style.width = `${anchoPx}px`;
    $$("details", hoja).forEach((d) => d.setAttribute("open", ""));
    anchos(hoja);
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
  /* ─── RLR · contacto vCard 3.0 (el mismo formato del sistema comercial) ─── */
  const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"]);
  function partirNombre(nombre) {
    const w = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    if (w.length <= 1) return { nombres: w.join(" "), apellidos: "" };
    const cuantos = w.length === 2 ? 1 : 2;
    let i = w.length - cuantos;
    while (i > 1 && PARTICULAS.has(w[i - 1].toLowerCase())) i--;
    return { nombres: w.slice(0, i).join(" "), apellidos: w.slice(i).join(" ") };
  }
  const vesc = (t) => String(t ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  function doblar(linea) {
    const enc = new TextEncoder(); const partes = []; let actual = "", bytes = 0, limite = 75;
    for (const ch of linea) {
      const b = enc.encode(ch).length;
      if (bytes + b > limite) { partes.push(actual); actual = ""; bytes = 0; limite = 74; }
      actual += ch; bytes += b;
    }
    partes.push(actual);
    return partes.join("\r\n ");
  }
  // Preguntas y respuestas de un envío, con las etiquetas del puesto
  function preguntasRespuestas(c, e) {
    const vistas = new Set(); const out = [];
    const crudas = (e.respuestas || []).filter((r) => r.r);
    const yaDicho = new Set(crudas.map((r) => String(r.r).trim()));
    for (const r of crudas) out.push([r.p, r.r]);
    for (const p of PC(c).preguntas || []) {
      if (vistas.has(p.clave)) continue;
      const r = e[p.clave] ?? (p.clave in e ? "" : c[p.clave]);
      if (r == null || r === "" || yaDicho.has(String(r).trim())) continue;
      vistas.add(p.clave); out.push([p.corta || p.etiqueta, r]);
    }
    out.push(["Referida por", e.referido || c.referido], ["Colonia", e.colonia || c.colonia]);
    return out;
  }
  function notaContacto(c) {
    const e = ultimoEnvio(c);
    const m = marcaDe(c);
    const v = veredicto(c);
    const lineas = [
      `Talento · ${PC(c).nombre}`,
      `${c.lugar ? `Lugar ${c.lugar} de ${st.total}` : "Nueva"} · ${c.puntos ?? "—"}/100 · ${v.largo}`,
      `Solicitud: ${fecha(c.ultimo_envio)}${c.envios > 1 ? ` · llenó ${c.envios} veces` : ""}`,
      "", "NUESTRA LECTURA", c.resumen || "—",
      `Lo que la hace brillar: ${c.a_favor || "—"}`, `Lo que hay que confirmar: ${c.a_cuidar || "—"}`,
      c.preguntar ? `Pregunta para la llamada: ${c.preguntar}` : "",
      "", `CALIFICACIÓN: ${medidoresDe(PC(c)).map(([n, k, max]) => `${n} ${c[k] ?? 0}/${max}`).join(" · ")}`,
      "", "SUS RESPUESTAS",
    ];
    for (const [pr, r] of preguntasRespuestas(c, e)) lineas.push(`${pr}`, `R: ${r || "—"}`, "");
    if (m.estado) lineas.push(`Etapa en la casa: ${ETAPA_NOMBRE[m.estado] || m.estado}`);
    if (m.nota) lineas.push("", "NOTAS DE LA CASA", m.nota);
    return lineas.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
  }
  function vcard(c) {
    const pre = PC(c).prefijo || "TA";
    const { nombres, apellidos } = partirNombre(c.nombre);
    const ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    const L = ["BEGIN:VCARD", "VERSION:3.0", `N:${vesc(apellidos)};${vesc(`${pre} ${nombres}`)};;;`, `FN:${vesc(`${pre} ${c.nombre}`)}`,
      `ORG:Talento;${vesc(PC(c).nombre)}`, `TITLE:${vesc(`Candidata a ${PC(c).nombre.toLowerCase()}`)}`, `TEL;TYPE=CELL,VOICE,pref:+52${c.celular}`];
    if (c.tel_extra) L.push("item1.TEL:+52" + c.tel_extra, "item1.X-ABLabel:Otro número");
    if (c.correo && !/notengo/i.test(c.correo)) L.push(`EMAIL;TYPE=INTERNET,HOME:${vesc(c.correo)}`);
    L.push(`item2.URL:https://wa.me/52${c.celular}`, "item2.X-ABLabel:WhatsApp");
    if (c.tel_extra) L.push(`item3.URL:https://wa.me/52${c.tel_extra}`, "item3.X-ABLabel:WhatsApp otro número");
    if (c.colonia) L.push(`ADR;TYPE=HOME:;;${vesc(c.colonia)};;;;México`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(c.nacimiento || "")) L.push(`BDAY:${c.nacimiento}`);
    L.push(`NOTE:${vesc(notaContacto(c))}`, `CATEGORIES:Talento,${vesc(PC(c).nombre)}`, `UID:talento-${c.id}`, `REV:${ahora}`, "END:VCARD");
    return L.map(doblar).join("\r\n") + "\r\n";
  }
  function descargarContacto(id) {
    const c = st.porId[id]; if (!c) return;
    const nombre = nombreArchivo(`${PC(c).prefijo || "TA"} ${c.nombre}`).replace(/\.pdf$/, ".vcf");
    const url = URL.createObjectURL(new Blob([vcard(c)], { type: "text/vcard;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    aviso(`Contacto de ${primer(c.nombre)} listo para guardar`);
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
      await guardarMarca(id, { estado: "contratada" });
      repintar();
      requestAnimationFrame(() => { animar(id, "contratar"); confeti(x, y); });
      aviso(`¡${st.porId[id].nombre} contratada!`);
    } catch { aviso("No se guardó. Revisa tu conexión."); }
    porContratar = null;
  }
  async function liberar(id) {
    try {
      await guardarMarca(id, { estado: "" });
      repintar();
      requestAnimationFrame(() => animar(id, "liberar"));
      aviso(`${st.porId[id].nombre} vuelve a estar disponible`);
    } catch { aviso("No se guardó. Revisa tu conexión."); }
  }

  /* ─── ficha completa ─── */
  function qaLista(c, e) {
    return `<dl class="qa-lista">${preguntasRespuestas(c, e).map(([p, r]) => `<div class="qa"><dt>${esc(p)}</dt><dd>${priv(r || "—")}</dd></div>`).join("")}</dl>`;
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
  function check(ok, titulo) {
    const si = String(ok || "").toLowerCase().startsWith("s");
    return `<div class="check ${si ? "si" : "no"}"><i aria-hidden="true">${si ? "✓" : "✕"}</i><div>${esc(titulo)}<small>${si ? "Sí" : "No"}</small></div></div>`;
  }
  function historiaDe(c) {
    const ev = st.eventos.filter((e) => e.id === c.id);
    if (!ev.length) return "";
    return `<div class="historia">${ev.map((e) => `<div><b>${ETAPA_NOMBRE[e.a] || e.a || "Sin etapa"}</b><span>${esc(nombreDe(e.quien))} · ${fecha(e.cuando)}</span></div>`).join("")}</div>`;
  }

  function fichaCompleta(c) {
    const v = veredicto(c);
    const p = PC(c), rub = p.rubrica || {};
    const i = st.lista.indexOf(c);
    const ant = st.lista[i - 1], sig = st.lista[i + 1];
    const m = marcaDe(c);
    const envios = c.envios_detalle || [];
    const d = ultimoEnvio(c);
    const otraSol = c.destacado != null && c.destacado !== envios.length - 1;
    const top = c.lugar && c.lugar <= 3 ? `Es la ${LUGARES[c.lugar - 1]} opción de las ${st.total}.` : "";
    const crudasFicha = new Set((d.respuestas || []).map((r) => String(r.r || "").trim()));
    const citas = (rub.citas || []).filter(([k]) => d[k] && !crudasFicha.has(String(d[k]).trim()));
    for (const r of d.respuestas || []) if (r.r) citas.push([`__${r.p}`, r.p]);
    return `
    <div class="fc-hero"><div class="fc-hero-in">
      <div class="fc-nav">
        <button class="btn btn-contorno-claro" data-cerrar-ficha>← <span>Volver</span><span class="solo-escritorio"> a la lista</span></button>
        ${ant ? `<button class="btn btn-contorno-claro" data-abrir="${ant.id}" aria-label="Anterior">‹ <span>Anterior</span></button>` : ""}
        ${sig ? `<button class="btn btn-contorno-claro" data-abrir="${sig.id}" aria-label="Siguiente"><span>Siguiente</span> ›</button>` : ""}
        <span class="fc-pos" title="Lugar ${c.lugar ?? "—"} de ${st.total}">${c.lugar ? `${c.lugar}/${st.total}` : "Nueva"}</span>
        <button class="btn btn-contorno-claro btn-chico" data-pdf="ficha" data-id="${c.id}">⬇ <span>PDF</span></button>
      </div>
      <div class="fc-top">
        <div>
          <div class="fc-lugar"><span class="num">${c.lugar ? `Lugar #${c.lugar}` : "Nueva"}</span><span class="veredicto v-${c.nivel}">${v.largo}</span><span class="insignia fuerte">${esc(p.nombre)}</span>${etapaPastilla(c)}${etiquetasHTML(c)}</div>
          <h1 id="fc-nombre">${nombreHTML(c.nombre)}</h1>
          <div class="fc-meta">
            ${c.edad ? `<span>${c.edad} años</span>` : ""}
            ${c.colonia ? `<span>${esc(c.colonia)}</span>` : ""}
            ${c.experiencia && c.experiencia.length < 30 ? `<span>${esc(c.experiencia)}</span>` : ""}
            <span>${c.envios > 1 ? `Llenó ${c.envios} veces · última ${fecha(c.ultimo_envio)}` : `Llenó el ${fecha(c.ultimo_envio)}`} · ${hace(c.ultimo_envio)}</span>
          </div>
          <div class="fc-contacto">
            ${waBoton(c, "btn-verde", `${ICONO_WA}WhatsApp ${telHTML(c.celular)}`)}
            <a class="btn btn-contorno-claro" href="tel:+52${c.celular}">${ICONO_TEL}Llamar</a>
            ${c.tel_extra ? `<a class="btn btn-contorno-claro" href="tel:+52${c.tel_extra}">${ICONO_TEL}Otro número ${telHTML(c.tel_extra)}</a>` : ""}
            <button class="btn btn-contorno-claro" data-vcf="${c.id}">⬇ Guardar contacto</button>
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
          <p class="lectura-lead">${priv(c.resumen || "—")}</p>
          <div class="dos">
            <div class="caja caja-bien"><h3>Lo que la hace brillar</h3><p>${priv(c.a_favor || "—")}</p></div>
            <div class="caja caja-ojo"><h3>Lo que hay que confirmar</h3><p>${priv(c.a_cuidar || "—")}</p></div>
          </div>
          ${c.preguntar ? `<div class="pregunta">${ICONO_PREG}<div><b>Pregunta para la primera llamada</b><p>${priv(c.preguntar)}</p></div></div>` : ""}
          ${etiquetasDe(c).map((e) => `<div class="etq-caja etq-${e.etiqueta}"><b>${ETQ[e.etiqueta][1]} ${ETQ[e.etiqueta][0]} ${e.orden || 1} de ${esc(p.nombre.toLowerCase())}</b><p>${priv(e.motivo || "")}</p></div>`).join("")}
          ${c.p_lista != null && c.p_lista >= 0 ? `<div class="dimensiones"><div class="dim"><span class="dim-n tab">${c.p_lista}<small>/10</small></span><div><b>Listeza</b><p>${esc(c.lista_motivo || "")}</p></div></div><div class="dim"><span class="dim-n tab">${c.p_empatia}<small>/10</small></span><div><b>Empatía</b><p>${esc(c.empatia_motivo || "")}</p></div></div></div>` : ""}
        </section>

        <section class="panel">
          <h2>En sus palabras</h2>
          <p class="sub">Lo que ella escribió${c.envios > 1 ? (otraSol ? ` en su solicitud del ${fecha(d.fecha)}, la que mejor la representa` : " en su solicitud más reciente") : " en su solicitud"}, tal cual.</p>
          ${citas.map(([k, t]) => `<div class="cita-titulo">${esc(t)}</div><blockquote class="cita"><p>«${priv(k.startsWith("__") ? ((d.respuestas || []).find((r) => r.p === t) || {}).r : d[k])}»</p></blockquote>`).join("")}
          ${rub.platillos && d[rub.platillos] ? `<div class="cita-titulo">Lo que cocina muy bien</div>${platillos(d[rub.platillos])}` : ""}
          ${!citas.length && !(rub.platillos && d[rub.platillos]) ? qaLista(c, d) : ""}
          ${cvs(d.cv)}
        </section>

        ${(rub.checks || []).length ? `<section class="panel">
          <h2>El arreglo de la casa</h2>
          <p class="sub">Lo que contestó sobre el horario y la convivencia.</p>
          <div class="checks">${rub.checks.map(([k, t]) => check(c[k] ?? d[k], t)).join("")}</div>
        </section>` : ""}

        ${envios.length > 1 ? `<section class="panel">
          <h2>Sus ${envios.length} solicitudes</h2>
          <p class="sub">Llenó el formulario más de una vez. Aquí está cada envío completo.</p>
          <div class="lineatiempo">${envios.slice().reverse().map((e, k) => `
            <details class="lt-envio" ${k === 0 ? "open" : ""}><summary>Solicitud del ${fecha(e.fecha)}<span>${e.fecha ? e.fecha.slice(11, 16) + " h" : ""}</span></summary>${qaLista(c, e)}</details>`).join("")}
          </div></section>` : `<section class="panel"><h2>Su solicitud completa</h2><p class="sub">Todas sus respuestas.</p>${qaLista(c, envios[0] || c)}</section>`}
      </div>

      <aside class="fc-lado">
        <section class="panel decision">
          <h2>Decisión de la casa</h2>
          <p class="sub">Lo que marquen aquí lo ve toda su casa.</p>
          ${marcasHTML(c)}
          ${noDisponible(c) ? "" : `<div class="sondeo-caja"><b>¿Está abierta a un nuevo trabajo?</b><p>Un clic y le llega un correo suave con dos botones; no se dice quién es la familia. Si no contesta, se repite tres veces, siempre en horario laboral (lunes a sábado de 9 a 19), la última también por SMS cuando haya proveedor.</p>${sondeoHTML(c, true)}</div>`}
          <div class="nota"><label for="nota-${c.id}">Notas de la llamada</label>
            <textarea id="nota-${c.id}" data-nota="${c.id}" placeholder="Ej. Contestó rápido, puede empezar el lunes…">${esc(m.nota || "")}</textarea>
            <small id="nota-estado-${c.id}">${m.nota && m.cuando ? `Guardado ${fecha(m.cuando)}` : "Se guarda solo"}</small></div>
          ${historiaDe(c)}
          <div class="compartir-caja" id="compartir-${c.id}">
            <button class="btn btn-contorno btn-chico" data-compartir="${c.id}">Compartir esta ficha</button>
            <small>Crea un enlace privado solo de ella, sin acceso al tablero. Vence en 7 días.</small>
          </div>
        </section>
        <section class="panel">
          <h2>Datos</h2>
          <div class="datos-lista">
            <div class="dato"><span>Celular y WhatsApp</span>${noDisponible(c) ? `<span class="apagado">${telHTML(c.celular)} · contratada</span>` : `<a href="${wa(c)}" target="_blank" rel="noopener">${telHTML(c.celular)}</a>`}</div>
            ${c.tel_extra ? `<div class="dato"><span>Otro número</span>${noDisponible(c) ? `<span class="apagado">${telHTML(c.tel_extra)}</span>` : `<a href="${wa(c, c.tel_extra)}" target="_blank" rel="noopener">${telHTML(c.tel_extra)}</a>`}</div>` : ""}
            <div class="dato"><span>Correo</span>${c.correo ? sens(c.correo) : "—"}</div>
            <div class="dato"><span>Edad</span>${c.edad ? `${c.edad} años · nació el ${fecha(c.nacimiento)}` : "No la dio"}</div>
            <div class="dato"><span>Colonia</span>${esc(c.colonia || "—")}</div>
            <div class="dato"><span>Referida por</span>${priv(c.referido || "—")}</div>
            <div class="dato"><span>Formulario</span>${esc(nombreFormulario(c))}</div>
            <div class="dato"><span>Evaluación</span>${c.evaluo === "deepseek-auto" ? "Automática con DeepSeek" : c.evaluo === "claude-auto" ? "Automática con Claude" : c.evaluo === "claude-revision" ? "Revisada una por una" : c.evaluo === "error" ? "Falló, se reintenta" : "Pendiente"}</div>
          </div>
        </section>
      </aside>
    </div>`;
  }
  function nombreFormulario(c) {
    const p = PC(c);
    const f = (p.formularios || []).find((x) => x.id === c.formulario);
    return f ? f.nombre : (p.formularios && p.formularios[0] ? p.formularios[0].nombre : p.nombre);
  }

  /* ─── rutas ─── */
  const PANTALLAS = { tablero: pintarTablero };
  function pintarPantalla() {
    const nombre = st.pantalla;
    const fn = PANTALLAS[nombre] || (window.TalentoPantallas && window.TalentoPantallas[nombre]) || pintarTablero;
    $$(".sidebar-item[data-ir]").forEach((a) => a.classList.toggle("activo", a.dataset.ir === nombre));
    fn($("#vista"));
    anchos($("#vista"));
    document.title = `${nombre === "tablero" ? "Candidatas" : $(`.sidebar-item[data-ir="${nombre}"] .titulo`)?.textContent || "Talento"} · Talento`;
  }
  const RUTAS = { "": "tablero", tablero: "tablero", embudo: "embudo", analitica: "analitica", puestos: "puestos", mensajes: "mensajes", como: "como", entradas: "entradas" };
  function ruta() {
    const h = location.hash.replace(/^#\/?/, "");
    const f = $("#ficha");
    if (h === "comparar") {
      if ((st.comparar[st.puesto] || []).length < 2) { history.replaceState(null, "", location.pathname + "#/"); }
      else {
        f.innerHTML = vistaComparar(); f.classList.remove("contratada");
        f.classList.remove("oculto"); f.scrollTop = 0; anchos(f);
        document.body.classList.add("con-ficha"); document.title = "Comparar · Talento";
        return;
      }
    }
    const m = h.match(/^c\/((?:[a-z0-9_-]+-)?\d{10})$/);
    const c = m && st.porId[m[1]];
    if (c) {
      if (c.puesto !== st.puesto) usarPuesto(c.puesto, false);
      f.innerHTML = fichaCompleta(c);
      f.classList.toggle("contratada", noDisponible(c));
      f.classList.remove("oculto"); f.scrollTop = 0; anchos(f); piezas();
      document.body.classList.add("con-ficha");
      const b = $("[data-cerrar-ficha]", f); if (b) b.focus({ preventScroll: true });
      document.title = `${c.nombre} · Talento`;
      return;
    }
    f.classList.add("oculto"); f.innerHTML = ""; document.body.classList.remove("con-ficha");
    const pantalla = RUTAS[h.split("/")[0]] || "tablero";
    if (pantalla !== st.pantalla || !$("#vista").children.length) {
      if (pantalla === "entradas" && !(st.yo && st.yo.admin)) { history.replaceState(null, "", location.pathname + "#/"); st.pantalla = "tablero"; }
      else st.pantalla = pantalla;
      pintarPantalla();
      window.scrollTo(0, 0);
    }
    $("#app").classList.remove("menu-abierto"); $("#abrir-menu").setAttribute("aria-expanded", "false");
  }
  function irA(hash) {
    const abierta = !$("#ficha").classList.contains("oculto");
    if (abierta && history.state && history.state.talento) history.replaceState({ talento: true }, "", hash);
    else history.pushState({ talento: true }, "", hash);
    ruta();
  }
  function abrir(id) { irA(`#/c/${id}`); }
  function cerrarFicha() {
    if (history.state && history.state.talento) { history.back(); return; }
    history.replaceState(null, "", location.pathname + "#/" + (st.pantalla === "tablero" ? "" : st.pantalla));
    ruta();
  }
  function ir(pantalla) { location.hash = pantalla === "tablero" ? "#/" : `#/${pantalla}`; }

  /* ─── marcar y notas ─── */
  async function guardarMarca(id, cambios) {
    const d = await api("/api/marca", { id, ...cambios });
    st.marcas[id] = d.marca;
    if (d.evento) st.eventos.push(d.evento);
    return d.marca;
  }
  const tNota = {};

  /* ─── importar CSV (solo Ricardo) ─── */
  function parseCSV(t) {
    const filas = []; let fila = [], campo = "", q = false;
    t = t.replace(/^\uFEFF/, "");
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { fila.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else campo += ch;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((x) => x.trim()));
  }
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[¿?¡!]/g, "").replace(/\s+/g, " ").trim();
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
  // RLR · lee un export del CRM con las preguntas del puesto elegido: la columna se reconoce por su etiqueta
  function filasDe(texto, puesto) {
    const t = parseCSV(texto); if (t.length < 2) return [];
    const cab = t[0].map(norm);
    const col = (...pruebas) => cab.findIndex((h) => pruebas.some((p) => (p instanceof RegExp ? p.test(h) : h === p)));
    const ix = {
      nombre: col("nombre (s)", "first name", "first_name", "nombre"), apellido: col("apellido paterno y materno", "last name", "last_name", "apellidos"),
      celular: col("celular personal", "phone", "telefono", "celular"), correo: col("correo", "email", "correo electronico"), tel_extra: col("telefono extra"),
      nacimiento: col(/fecha de nacimiento|date_of_birth/), referido: col("referido por"), fecha: col("submission date", "created", "enviado el", "created at", "fecha"),
      colonia: col(/colonia/), cv: col(/curri|hoja de vida/),
    };
    if (ix.celular < 0) return [];
    const pregs = (puesto.preguntas || []).map((p) => ({ ...p, i: cab.findIndex((h) => h === norm(p.etiqueta) || (norm(p.etiqueta).length > 12 && h.includes(norm(p.etiqueta).slice(0, 40)))) })).filter((p) => p.i >= 0);
    if (!pregs.length && !["domestica", "finde", "guia"].includes(puesto.id)) { /* se aceptan de todos modos: quedan como respuestas sueltas */ }
    const conocidas = new Set([...Object.values(ix).filter((i) => i >= 0), ...pregs.map((p) => p.i)]);
    const v = (f, i) => (i >= 0 ? String(f[i] || "").replace(/^="?|"$/g, "").trim() : "");
    return t.slice(1).map((f) => {
      const fila = {
        nombre: `${v(f, ix.nombre)} ${v(f, ix.apellido)}`.trim(), celular: v(f, ix.celular), correo: v(f, ix.correo), tel_extra: v(f, ix.tel_extra),
        nacimiento: v(f, ix.nacimiento), referido: v(f, ix.referido), fecha: fechaCSV(v(f, ix.fecha)), colonia: v(f, ix.colonia), cv: v(f, ix.cv), respuestas: [],
      };
      for (const p of pregs) if (fila[p.clave] == null || !fila[p.clave]) fila[p.clave] = v(f, p.i);
      // Columnas con texto que no reconocimos: se guardan tal cual con su encabezado
      t[0].forEach((h, i) => { if (!conocidas.has(i) && !/^(id|contact ?id|timezone|ip|source|form|url|tags|owner)/i.test(h.trim()) && v(f, i) && v(f, i).length > 1) fila.respuestas.push({ p: h.trim(), r: v(f, i) }); });
      return fila;
    }).filter((r) => r.celular);
  }
  async function importar(archivos) {
    if (st.puesto === "*") { aviso("Elige un puesto antes de subir el archivo"); return; }
    let filas = [];
    for (const a of archivos) filas = filas.concat(filasDe(await a.text(), P()));
    if (!filas.length) { aviso("Ese archivo no parece un export del formulario"); return; }
    filas.sort((a, b) => (b.fecha ? 1 : 0) - (a.fecha ? 1 : 0) || String(a.fecha).localeCompare(String(b.fecha)));
    aviso(`Subiendo ${filas.length} filas como ${P().nombre}…`);
    const tot = { nuevas: 0, volvieron: 0, sinCambio: 0 };
    for (let i = 0; i < filas.length; i += 200) {
      const r = await api("/api/importar", { filas: filas.slice(i, i + 200), puesto: st.puesto });
      tot.nuevas += r.nuevas; tot.volvieron += r.volvieron; tot.sinCambio += r.sinCambio;
    }
    aviso(`${tot.nuevas} nuevas · ${tot.volvieron} volvieron a llenar · ${tot.sinCambio} sin cambios`, 5000);
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
        hechas++; aviso(`${r.motor === "deepseek-auto" ? "DeepSeek" : "Claude"} evaluó a ${r.nombre}${r.ok ? "" : ` (falló: ${r.error})`} · quedan ${r.quedan}`, 6000);
        if (!r.quedan) break;
        r = await api("/api/evaluar", {});
      }
      if (hechas) await cargar(); else aviso("No hay candidatas pendientes");
    } catch { aviso("No se pudo evaluar. Intenta de nuevo."); }
    evaluando = false;
  }
  let sincronizando = false;
  async function sincronizar(puesto) {
    if (sincronizando) return; sincronizando = true;
    aviso("Trayendo lo nuevo del CRM…", 20000);
    try {
      const r = await api("/api/sync", puesto ? { puesto } : {});
      const n = r.puestos.reduce((a, p) => a + (p.nuevas || 0), 0), v = r.puestos.reduce((a, p) => a + (p.volvieron || 0), 0);
      const fallas = r.puestos.filter((p) => p.error);
      aviso(`CRM: ${n} nuevas · ${v} volvieron a llenar${fallas.length ? ` · ${fallas.length} formularios con error` : ""}`, 6000);
      await cargar();
      if (n + v) await evaluar(false);
    } catch (e) {
      const d = e.datos || {};
      if (d.error === "sin llave") { aviso("Falta la llave del CRM de la subcuenta Talento. Mira la pantalla Puestos.", 7000); ir("puestos"); }
      else aviso("No se pudo sincronizar. Intenta de nuevo.");
    }
    sincronizando = false;
  }

  /* ─── RLR · sondeo: ver el correo y el SMS antes de mandarlos, editarlos y mandar ─── */
  let sondeoActual = null;
  const horaLocal = (iso) => { const d = new Date(iso), hoy = new Date(), man = new Date(hoy); man.setDate(hoy.getDate() + 1);
    const dia = d.toDateString() === hoy.toDateString() ? "hoy" : d.toDateString() === man.toDateString() ? "mañana" : d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
    return `${dia} ${d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}`; };
  async function abrirSondeo(id) {
    const c = st.porId[id]; if (!c) return;
    const dlg = $("#dlg-sondeo");
    dlg.classList.remove("encoger");
    dlg.innerHTML = `<div class="dlg"><p class="sub">Preparando la vista previa…</p></div>`;
    dlg.showModal();
    let v;
    try { v = await api(`/api/sondeo/vista?id=${encodeURIComponent(id)}`); } catch { dlg.close(); aviso("No se pudo preparar el sondeo"); return; }
    sondeoActual = { id, v };
    dlg.innerHTML = `
      <div class="dlg sondeo-modal">
        <div class="eyebrow">Sondeo de disponibilidad</div>
        <h2 id="sondeo-titulo">¿${esc(v.primer)} está abierta a un nuevo trabajo?</h2>
        <p class="sub">Esto es exactamente lo que le va a llegar. Puedes afinar el texto antes de mandarlo. ${v.correoValido ? `Correo: <b>${sens(v.correo)}</b>.` : `<b>No dejó un correo válido</b>, así que por ahora no se puede mandar.`}</p>
        <div class="sondeo-cols">
          <section class="sondeo-correo">
            <h3>Correo 1 · sale ahora</h3>
            <label class="campo"><span>Asunto</span><input id="son-asunto" maxlength="140" value="${esc(v.textos.asunto)}"></label>
            <div class="correo-vista" id="correo-vista">
              <div class="cv-marca">Reclutamiento Talento · Torreón</div>
              <div class="cv-hola">Hola, ${esc(v.primer)} 👋</div>
              <textarea id="son-intro" class="cv-intro" rows="3" maxlength="1200" aria-label="Texto del correo">${esc(v.textos.intro)}</textarea>
              <div class="cv-condiciones"><div class="cv-marca">En qué aplicaste</div><textarea id="son-condiciones" class="cv-intro" rows="3" maxlength="600" aria-label="En qué aplicó">${esc(v.textos.condiciones || "")}</textarea>${v.sinSueldo ? `<small class="cv-aviso">Este puesto no tiene sueldo escrito. Ponlo aquí para filtrar, o guárdalo en <button type="button" class="liga" data-ir="puestos">Puestos</button> para que salga siempre.</small>` : ""}</div>
              <div class="cv-pregunta">${esc(v.pregunta)}</div>
              <div class="cv-botones"><span class="btn btn-verde">Sí, estoy abierta a negociar</span><span class="btn btn-contorno">Por ahora no</span></div>
              <div class="cv-cierre">${esc(v.cierre)}</div>
              <div class="cv-pie">${esc(v.pie)}</div>
            </div>
          </section>
          <section class="sondeo-lado">
            <h3>SMS · va con el aviso 4</h3>
            <textarea id="son-sms" class="entrada-texto" rows="4" maxlength="320" aria-label="Texto del SMS">${esc(v.textos.sms)}</textarea>
            <small class="quien">Las ligas {liga_si} y {liga_no} se llenan solas. ${v.sms_disponible ? "" : "Todavía no hay proveedor de SMS: se anota y se manda cuando lo haya."}</small>
            <h3>Si no contesta</h3>
            <ol class="sondeo-plan">${v.plan.map((p) => `<li><b>${p.paso === 1 ? "Correo 1" : `Aviso ${p.paso}`}</b> · ${p.paso === 1 ? "ahora" : horaLocal(p.cuando)}${p.paso > 1 ? `<br><span class="quien">«${esc(v.avisos[p.paso] || "")}»${p.canales.includes("sms") ? " · correo y SMS" : ""}</span>` : ""}</li>`).join("")}</ol>
            <small class="quien">Siempre en horario laboral, lunes a sábado de 9 a 19. En cuanto conteste cualquiera, se detiene todo.</small>
          </section>
        </div>
      </div>
      <div class="dlg-pie">${st.yo.admin ? `<button class="btn btn-fantasma" id="btn-sondeo-prueba">Mandarme una prueba</button>` : ""}<button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-verde" id="btn-sondeo-enviar" ${v.correoValido ? "" : "disabled"}>${ICONO_PREG}Enviar a ${esc(v.primer)}</button></div>`;
  }
  function textosDelModal() {
    return { asunto: $("#son-asunto").value.trim(), intro: $("#son-intro").value.trim(), condiciones: $("#son-condiciones").value.trim(), sms: $("#son-sms").value.trim() };
  }
  async function enviarSondeo(prueba) {
    if (!sondeoActual) return;
    const { id, v } = sondeoActual;
    const dlg = $("#dlg-sondeo");
    let correo = "";
    if (prueba) { correo = prompt("¿A qué correo mando la prueba?", "ricardo@superleads.mx"); if (!correo) return; }
    $$("button", dlg).forEach((b) => { b.disabled = true; });
    try {
      const r = await api("/api/sondeo", { id, prueba, correo, textos: textosDelModal() });
      // El modal se encoge hacia la notificación de abajo y ahí se queda el aviso
      dlg.classList.add("encoger");
      setTimeout(() => { dlg.close(); dlg.classList.remove("encoger"); }, 520);
      aviso(prueba ? `Prueba enviada a ${correo}` : `✉ Correo enviado a ${v.primer}. Si no contesta, aviso 2 ${r.siguiente ? horaLocal(r.siguiente) : "en horario laboral"}.`, 7000);
      if (!prueba) { sondeoActual = null; await cargar(); } else $$("button", dlg).forEach((b) => { b.disabled = false; });
    } catch (e) {
      $$("button", dlg).forEach((b) => { b.disabled = false; });
      aviso((e.datos && e.datos.mensaje) || "No se pudo mandar", 6000);
    }
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
    const bIr = t.closest("[data-ir]");
    if (bIr) { ev.preventDefault(); ir(bIr.dataset.ir); return; }
    const bMsg = t.closest("[data-mensaje]");
    if (bMsg) {
      const pu = bMsg.dataset.puestoMsg || st.puesto;
      guardar(`talento-mensaje-${pu}`, bMsg.dataset.mensaje);
      repintar();
      aviso(`WhatsApp con mensaje «${opcionMensaje(pu)[1]}»`);
      return;
    }
    const bEd = t.closest("[data-editar-mensaje]");
    if (bEd) { editarMensaje(bEd.dataset.editarMensaje); return; }
    if (t.id === "btn-msg-guardar") { guardarTexto(false); return; }
    if (t.id === "btn-msg-restaurar") { guardarTexto(true); return; }
    const bVcf = t.closest("[data-vcf]");
    if (bVcf) { descargarContacto(bVcf.dataset.vcf); return; }
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
    const bSon = t.closest("[data-sondeo]");
    if (bSon) { ev.stopPropagation(); abrirSondeo(bSon.dataset.sondeo); return; }
    const bSonP = t.closest("[data-sondeo-prueba]");
    if (bSonP) { ev.stopPropagation(); abrirSondeo(bSonP.dataset.sondeoPrueba); return; }
    if (t.id === "btn-sondeo-enviar") { enviarSondeo(false); return; }
    if (t.id === "btn-sondeo-prueba") { enviarSondeo(true); return; }
    const bFav = t.closest("[data-favorita]");
    if (bFav) {
      ev.stopPropagation();
      const id = bFav.dataset.favorita;
      try { await guardarMarca(id, { favorita: !(marcaDe(st.porId[id]).favorita) }); aviso(st.marcas[id].favorita ? "Marcada con “Me gusta”" : "“Me gusta” quitado"); repintar(); }
      catch { aviso("No se guardó. Revisa tu conexión."); }
      return;
    }
    const bMarca = t.closest(".marcas button[data-estado]");
    if (bMarca) {
      ev.stopPropagation();
      const id = bMarca.closest(".marcas").dataset.id;
      if (bMarca.dataset.estado === "contratada") {
        const r = bMarca.getBoundingClientRect();
        pedirContratar(id, r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
      const actual = marcaDe(st.porId[id]).estado;
      const nuevo = actual === bMarca.dataset.estado ? "" : bMarca.dataset.estado;
      try {
        await guardarMarca(id, { estado: nuevo });
        aviso(nuevo ? `Etapa: ${ETAPA_NOMBRE[nuevo]}` : "Regresa a nueva");
        repintar();
      } catch { aviso("No se guardó. Revisa tu conexión."); }
      return;
    }
    if (t.closest("a")) return; // WhatsApp y teléfono abren solos
    const bAbrir = t.closest("[data-abrir]");
    if (bAbrir) { abrir(bAbrir.dataset.abrir); return; }
    if (t.closest("[data-cerrar-ficha]")) { cerrarFicha(); return; }
    const card = t.closest(".tarjeta, .ficha, tr.fila");
    if (card && !t.closest("button, select, input, textarea")) { abrir(card.dataset.id); return; }
    const bPuesto = t.closest("button.puesto[data-puesto]");
    if (bPuesto) { st.puesto = bPuesto.dataset.puesto; if (st.puesto !== "*") usarPuesto(st.puesto); else { st.lista = st.todas; pintarPantalla(); } return; }
    const chip = t.closest("[data-filtro]");
    if (chip) { st.filtro = chip.dataset.filtro; pintarChips(); pintarLista(); return; }
    const bVista = t.closest("[data-vista]");
    if (bVista) { st.vista = bVista.dataset.vista; guardar("talento-vista", st.vista); pintarTablero(); return; }
    if (t.id === "btn-ver-d") { st.verD = true; pintarLista(); return; }
    if (t.id === "btn-evaluar") { evaluar(true); return; }
    if (t.id === "btn-agregar") { $("#archivo").click(); return; }
    if (t.id === "btn-sync") { sincronizar(); return; }
    if (t.id === "btn-etiquetas") {
      aviso("DeepSeek y Claude están leyendo todo el lote y debatiendo… puede tardar varios minutos", 300000);
      api("/api/etiquetas", {}).then(async (r) => { const con = r.puestos.filter((x) => x.etiquetas && x.etiquetas.length); aviso(`El comité deliberó en ${con.length} puesto(s)${r.puestos.filter((x) => x.error).length ? " · alguno falló" : ""}`, 6000); await cargar(); }).catch(() => aviso("El comité no pudo deliberar"));
      return;
    }
    if (t.id === "abrir-menu") { const ab = $("#app").classList.toggle("menu-abierto"); t.setAttribute("aria-expanded", ab); return; }
    if (t.closest("[data-cerrar]")) { t.closest("dialog").close(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#ficha").classList.contains("oculto")) cerrarFicha();
    if (e.key === "Enter" && e.target.classList && (e.target.classList.contains("tarjeta") || e.target.classList.contains("fila"))) abrir(e.target.dataset.id);
  });
  document.addEventListener("input", (e) => {
    const id = e.target.dataset && e.target.dataset.nota;
    if (id) {
      const est = $(`#nota-estado-${id}`); if (est) est.textContent = "Escribiendo…";
      clearTimeout(tNota[id]);
      tNota[id] = setTimeout(async () => {
        try { await guardarMarca(id, { nota: e.target.value }); if (est) est.textContent = "Guardado ✓"; }
        catch { if (est) est.textContent = "No se guardó"; }
      }, 800);
      return;
    }
    if (e.target.id === "buscar") {
      clearTimeout(tBuscar);
      st.qTexto = e.target.value;
      tBuscar = setTimeout(() => { st.q = norm(e.target.value); pintarLista(); }, 180);
    }
  });
  let tBuscar;
  window.addEventListener("hashchange", ruta);
  window.addEventListener("popstate", ruta);
  $("#tam-mas").addEventListener("click", () => aviso(`Letra al ${Math.round(escala(.1) * 100)} %`));
  $("#tam-menos").addEventListener("click", () => aviso(`Letra al ${Math.round(escala(-.1) * 100)} %`));
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
  $("#btn-salir").addEventListener("click", async () => {
    ponerLlave("");
    try { await fetch(API + "/api/salir", { method: "POST" }); } catch { /* sin conexión */ }
    location.replace(ENTRADA);
  });
  $("#archivo").addEventListener("change", (e) => { if (e.target.files.length) importar([...e.target.files]); e.target.value = ""; });

  // Privacidad: se recuerda en este navegador
  document.body.classList.toggle("privado", guardado("talento-privado", "0") === "1");
  const pintarPrivado = () => { const b = $("#btn-privado"); if (!b) return; const on = document.body.classList.contains("privado"); b.setAttribute("aria-pressed", on); b.title = on ? "Privacidad encendida: apellidos, teléfonos y correos difuminados" : "Encender privacidad"; };
  pintarPrivado();
  $("#btn-privado").addEventListener("click", () => { const on = document.body.classList.toggle("privado"); guardar("talento-privado", on ? "1" : "0"); pintarPrivado(); aviso(on ? "Privacidad encendida: solo se ven primer nombre, colonia y edad" : "Privacidad apagada"); });
  st.vista = guardado("talento-vista", "tarjetas");
  st.puesto = guardado("talento-puesto", "domestica");
  escala(0);

  // RLR · lo que usan las otras pantallas (pantallas.js)
  window.Talento = { st, $, $$, esc, fecha, hace, dias, tel, primer, iniciales, api, aviso, guardarMarca, abrir, repintar, anchos, waBoton, marcasHTML, veredicto, medidores,
    P, PC, selectorPuestos, usarPuesto, ETAPAS, ETAPA_NOMBRE, ESTADOS, opcionMensaje, textoMensaje, editarMensaje, importar, evaluar, sincronizar, nombreDe, cargar, ir,
    marcaDe, etapaDe, etapaPastilla, etiquetasHTML, etiquetasDe, sondeoHTML, sondeoDe, nombreHTML, priv, sens, noDisponible, reciente, ICONO_WA, wa, guardado, guardar, medidoresDe, nombreFormulario };
  cargar().catch(() => {});
})();
/* fin · RLR · Ricardo López Reyero */
