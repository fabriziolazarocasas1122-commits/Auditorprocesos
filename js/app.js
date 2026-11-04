/* AuditaProcesos — app de auditoría de procesos sin servidor.
 * Todo se guarda en localStorage. Se puede respaldar o compartir exportando .json.
 */
(function () {
  'use strict';

  // ---------- Constantes ----------
  var KEY = 'auditaprocesos.v1';
  var RES = { C: 'Cumple', P: 'Cumple parcialmente', NC: 'No cumple', NA: 'No aplica' };
  var RES_CORTO = { C: 'Cumple', P: 'Parcial', NC: 'No cumple', NA: 'N/A' };
  var TIPOS = { NCM: 'No conformidad mayor', NCm: 'No conformidad menor', OBS: 'Observación', OM: 'Oportunidad de mejora' };
  var ESTADOS_ACC = ['Pendiente', 'En proceso', 'Implementada', 'Verificada (eficaz)', 'No eficaz'];
  var ESTADOS_AUD = { plan: 'Planificación', ejec: 'En ejecución', cerrada: 'Cerrada' };
  var ETAPAS = [
    { k: 'datos', n: 1, t: 'Planificación' },
    { k: 'ejecucion', n: 2, t: 'Lista de verificación' },
    { k: 'hallazgos', n: 3, t: 'Hallazgos' },
    { k: 'informe', n: 4, t: 'Informe' },
    { k: 'seguimiento', n: 5, t: 'Seguimiento' }
  ];

  // ---------- Estado ----------
  var db = { auditorias: [], plantillas: [] };
  var ui = { proc: {}, filtro: 'todos', incluirObs: false, draft: null, fileMode: null };
  var app = document.getElementById('app');

  // ---------- Persistencia ----------
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        db.auditorias = Array.isArray(d.auditorias) ? d.auditorias : [];
        db.plantillas = Array.isArray(d.plantillas) ? d.plantillas : [];
      }
    } catch (e) { storageFail(); }
  }
  var saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    var go = function () {
      saveTimer = null;
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) { storageFail(); }
    };
    if (now) go(); else saveTimer = setTimeout(go, 300);
  }
  window.addEventListener('pagehide', function () { if (saveTimer) save(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && saveTimer) save(true); });
  function storageFail() {
    var b = document.getElementById('storage-warning');
    if (b) b.hidden = false;
  }

  // ---------- Utilidades ----------
  function uid(p) { return (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fecha(s) {
    if (!s) return '—';
    var p = String(s).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : esc(s);
  }
  function slug(s) { return String(s || 'auditoria').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50); }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function download(name, content, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function plantillas() { return (window.PLANTILLAS_BASE || []).concat(db.plantillas); }
  function getPlantilla(id) { return plantillas().filter(function (p) { return p.id === id; })[0]; }
  function getAud(id) { return db.auditorias.filter(function (a) { return a.id === id; })[0]; }
  function touch(a) { a.actualizado = new Date().toISOString(); save(); }
  function esBase(id) { return String(id).indexOf('base-') === 0; }

  // ---------- Cálculos ----------
  function itemsDe(p) {
    var out = [];
    (p.secciones || []).forEach(function (s) { (s.items || []).forEach(function (it) { out.push(it); }); });
    return out;
  }
  function stats(a, procs) {
    var s = { total: 0, C: 0, P: 0, NC: 0, NA: 0, pend: 0, pct: null };
    (procs || a.procesos).forEach(function (p) {
      itemsDe(p).forEach(function (it) {
        s.total++;
        var r = (a.respuestas[it.id] || {}).resultado;
        if (r && s[r] !== undefined) s[r]++; else s.pend++;
      });
    });
    var ev = s.C + s.P + s.NC;
    s.pct = ev ? Math.round(((s.C + 0.5 * s.P) / ev) * 1000) / 10 : null;
    s.avance = s.total ? Math.round(((s.total - s.pend) / s.total) * 100) : 0;
    return s;
  }
  function nivel(pct) {
    if (pct == null) return { t: 'Sin evaluar', c: 'muted' };
    if (pct >= 90) return { t: 'Satisfactorio', c: 'ok' };
    if (pct >= 75) return { t: 'Aceptable', c: 'good' };
    if (pct >= 50) return { t: 'En desarrollo', c: 'warn' };
    return { t: 'Crítico', c: 'bad' };
  }
  function hallazgos(a) {
    var out = [];
    a.procesos.forEach(function (p) {
      var n = 0;
      (p.secciones || []).forEach(function (s) {
        (s.items || []).forEach(function (it) {
          n++;
          var r = a.respuestas[it.id];
          if (r && r.tipo) {
            out.push({ id: it.id, proceso: p.codigo + ' ' + p.nombre, codigo: p.codigo, num: n, requisito: it.pregunta,
              referencia: it.referencia, resultado: r.resultado, tipo: r.tipo, descripcion: r.hallazgo || '', evidencia: r.evidencia || '', extra: false });
          }
        });
      });
    });
    (a.extras || []).forEach(function (x) {
      out.push({ id: x.id, proceso: x.proceso || 'General', codigo: '', num: '+', requisito: '(Hallazgo adicional)', referencia: x.referencia || '',
        resultado: '', tipo: x.tipo, descripcion: x.descripcion || '', evidencia: x.evidencia || '', extra: true });
    });
    return out;
  }
  function conteoTipos(hs) {
    var c = { NCM: 0, NCm: 0, OBS: 0, OM: 0 };
    hs.forEach(function (h) { if (c[h.tipo] !== undefined) c[h.tipo]++; });
    return c;
  }
  function requiereAccion(h) { return h.tipo === 'NCM' || h.tipo === 'NCm'; }
  function accionCerrada(acc) { return acc && (acc.estado === 'Implementada' || acc.estado === 'Verificada (eficaz)'); }

  function nuevaAuditoria() {
    return {
      id: uid('aud'), version: 1, titulo: '', organizacion: '', area: '', tipo: 'Interna',
      auditorLider: '', equipo: '', auditados: '', fechaInicio: hoy(), fechaFin: hoy(),
      objetivo: 'Verificar que los procedimientos auditados se cumplen y son eficaces, e identificar no conformidades y oportunidades de mejora.',
      alcance: '', criterios: '', estado: 'plan', procesos: [], respuestas: {}, extras: [], acciones: {},
      fortalezas: '', conclusiones: '', creado: new Date().toISOString(), actualizado: new Date().toISOString()
    };
  }

  // ---------- Router ----------
  function parts() { return (location.hash || '#/').slice(1).split('/').filter(Boolean); }
  function render() {
    var p = parts(), html;
    if (!p.length) html = vInicio();
    else if (p[0] === 'plantillas') html = vPlantillas();
    else if (p[0] === 'plantilla') html = vPlantilla(p[1]);
    else if (p[0] === 'metodologia') html = vMetodologia();
    else if (p[0] === 'auditoria' && p[1] === 'nueva') html = vDatos(null);
    else if (p[0] === 'auditoria') {
      var a = getAud(p[1]);
      html = a ? vAuditoria(a, p[2] || 'ejecucion') : vNoEncontrado();
    } else html = vNoEncontrado();
    app.innerHTML = html;
    var sec = p[0] === 'plantilla' ? 'plantillas' : (p[0] === 'auditoria' || !p.length ? 'inicio' : p[0]);
    document.querySelectorAll('[data-nav]').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-nav') === sec); });
  }
  window.addEventListener('hashchange', function () {
    if (parts()[0] !== 'plantilla') ui.draft = null;
    render(); window.scrollTo(0, 0);
  });

  // ---------- Vistas ----------
  function vNoEncontrado() {
    return '<div class="empty"><img class="empty-bot" src="img/detecto.png" alt=""><h2>No encontrado</h2><p>La página o la auditoría no existe en este navegador.</p><a class="btn primary" href="#/">Ir al inicio</a></div>';
  }

  function vInicio() {
    var list = db.auditorias.slice().sort(function (a, b) { return (b.actualizado || '').localeCompare(a.actualizado || ''); });
    var h = '<section class="hero' + (list.length ? ' compact' : '') + '"><div>' +
      '<span class="bubble">¡Hola! Soy Detecto 👋</span>' +
      '<h1>Audita tus procesos en <span>5 pasos</span></h1>' +
      '<p>' + (list.length ? 'Tienes ' + list.length + ' auditoría' + (list.length > 1 ? 's' : '') + ' en este navegador. Continúa donde te quedaste o empieza una nueva.'
        : 'Planifica, verifica, registra hallazgos, genera el informe y da seguimiento al plan de acción. Ya tienes listas para admisión, atención médica, agendamiento, cuadre de caja y revisión documental.') + '</p>' +
      '<div class="actions"><a class="btn primary" href="#/auditoria/nueva">+ Nueva auditoría</a><button class="btn" data-action="importar-aud">Importar .json</button>' +
      (list.length ? '' : '<a class="btn" href="#/metodologia">Ver la metodología</a>') + '</div></div>' +
      '<img class="hero-bot" src="img/detecto.png" alt="Detecto, el asistente de auditoría"></section>';
    if (!list.length) return h;
    h += '<h2>Mis auditorías</h2>';
    h += '<div class="cards">';
    list.forEach(function (a) {
      var s = stats(a), nv = nivel(s.pct);
      h += '<article class="card aud-card">' +
        '<div class="card-top"><span class="badge st-' + a.estado + '">' + ESTADOS_AUD[a.estado] + '</span><span class="muted small">' + fecha(a.fechaInicio) + '</span></div>' +
        '<h3><a href="#/auditoria/' + a.id + '/ejecucion">' + esc(a.titulo || 'Auditoría sin título') + '</a></h3>' +
        '<p class="muted small">' + esc(a.organizacion || '') + (a.area ? ' · ' + esc(a.area) : '') + '</p>' +
        '<p class="small">' + a.procesos.map(function (p) { return '<span class="chip">' + esc(p.codigo) + '</span>'; }).join(' ') + '</p>' +
        '<div class="meter"><div style="width:' + s.avance + '%"></div></div>' +
        '<div class="card-foot"><span class="small">Avance ' + s.avance + '%</span><span class="small lvl ' + nv.c + '">' + (s.pct == null ? 'Sin evaluar' : s.pct + '% · ' + nv.t) + '</span></div>' +
        '<div class="card-actions"><a class="btn sm" href="#/auditoria/' + a.id + '/ejecucion">Abrir</a>' +
        '<button class="btn sm" data-action="exportar-aud" data-id="' + a.id + '">Exportar .json</button>' +
        '<button class="btn sm" data-action="duplicar-aud" data-id="' + a.id + '">Duplicar</button>' +
        '<button class="btn sm danger-t" data-action="eliminar-aud" data-id="' + a.id + '">Eliminar</button></div>' +
        '</article>';
    });
    return h + '</div>';
  }

  function campo(label, name, val, type, extra) {
    type = type || 'text';
    var inp = type === 'textarea'
      ? '<textarea name="' + name + '" rows="3">' + esc(val) + '</textarea>'
      : '<input type="' + type + '" name="' + name + '" value="' + esc(val) + '"' + (extra || '') + '>';
    return '<label class="field"><span>' + label + '</span>' + inp + '</label>';
  }

  function vDatos(a) {
    var nueva = !a;
    a = a || nuevaAuditoria();
    var sel = {};
    a.procesos.forEach(function (p) { sel[p.plantillaId] = true; });
    var h = '';
    if (nueva) h += '<section class="page-head"><div><a class="back" href="#/">← Auditorías</a><h1>Nueva auditoría</h1><p class="sub">Etapa 1 · Planificación</p></div></section>';
    h += '<form id="form-datos" class="panel" data-id="' + (nueva ? '' : a.id) + '">' +
      '<h2>Datos generales</h2><div class="grid2">' +
      campo('Título de la auditoría *', 'titulo', a.titulo, 'text', ' required placeholder="Ej.: Auditoría interna de procesos ambulatorios 2026"') +
      campo('Organización', 'organizacion', a.organizacion, 'text', ' placeholder="Ej.: Detecta Clínica"') +
      campo('Área / unidad auditada', 'area', a.area) +
      '<label class="field"><span>Tipo de auditoría</span><select name="tipo">' +
      ['Interna', 'Externa', 'De seguimiento', 'Extraordinaria'].map(function (t) { return '<option' + (a.tipo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      campo('Auditor líder', 'auditorLider', a.auditorLider) +
      campo('Equipo auditor', 'equipo', a.equipo, 'text', ' placeholder="Nombres separados por comas"') +
      campo('Fecha de inicio', 'fechaInicio', a.fechaInicio, 'date') +
      campo('Fecha de fin', 'fechaFin', a.fechaFin, 'date') +
      '</div>' +
      campo('Personas entrevistadas / auditados', 'auditados', a.auditados, 'textarea') +
      campo('Objetivo', 'objetivo', a.objetivo, 'textarea') +
      campo('Alcance', 'alcance', a.alcance, 'textarea') +
      '<label class="field"><span>Criterios de auditoría</span><textarea name="criterios" rows="4" placeholder="Si lo dejas vacío, se llenará con las normas de las plantillas elegidas.">' + esc(a.criterios) + '</textarea></label>' +
      '<h2>Procesos a auditar</h2><p class="muted small">Elige una o más listas de verificación. Puedes crear nuevas en <a href="#/plantillas">Plantillas</a>.</p>' +
      '<div class="tpl-pick">';
    plantillas().forEach(function (p) {
      var n = itemsDe(p).length;
      h += '<label class="pick"><input type="checkbox" name="plantillas" value="' + esc(p.id) + '"' + (sel[p.id] ? ' checked' : '') + '>' +
        '<span><strong>' + esc(p.codigo) + ' · ' + esc(p.nombre) + '</strong><span class="muted small">' + esc(p.area || '') + ' · ' + n + ' requisitos</span></span></label>';
    });
    h += '</div><div class="actions end">' +
      (nueva ? '<a class="btn" href="#/">Cancelar</a>' : '') +
      '<button class="btn primary" type="submit">' + (nueva ? 'Crear y empezar la verificación →' : 'Guardar cambios') + '</button></div></form>';
    return h;
  }

  function vAuditoria(a, etapa) {
    var s = stats(a);
    var h = '<section class="page-head aud-head no-print"><div><a class="back" href="#/">← Auditorías</a>' +
      '<h1>' + esc(a.titulo || 'Auditoría sin título') + '</h1>' +
      '<p class="sub">' + esc(a.organizacion) + (a.area ? ' · ' + esc(a.area) : '') + ' · <span class="badge st-' + a.estado + '">' + ESTADOS_AUD[a.estado] + '</span></p></div>' +
      '<div class="actions"><button class="btn" data-action="exportar-aud" data-id="' + a.id + '">Exportar .json</button></div></section>';
    h += '<nav class="stepper no-print">' + ETAPAS.map(function (e) {
      return '<a href="#/auditoria/' + a.id + '/' + e.k + '" class="' + (e.k === etapa ? 'on' : '') + '"><b>' + e.n + '</b><span>' + e.t + '</span></a>';
    }).join('') + '</nav>';
    if (etapa === 'datos') h += vDatos(a);
    else if (etapa === 'hallazgos') h += vHallazgos(a);
    else if (etapa === 'informe') h += vInforme(a, s);
    else if (etapa === 'seguimiento') h += vSeguimiento(a);
    else h += vEjecucion(a, s);
    return h;
  }

  function vEjecucion(a, s) {
    if (!a.procesos.length) return '<div class="empty"><p>Esta auditoría no tiene procesos.</p><a class="btn primary" href="#/auditoria/' + a.id + '/datos">Elegir procesos</a></div>';
    var idx = Math.min(ui.proc[a.id] || 0, a.procesos.length - 1);
    var p = a.procesos[idx];
    var h = '<div class="exec-top"><div class="tabs" role="tablist">' + a.procesos.map(function (pp, i) {
      var ps = stats(a, [pp]);
      return '<button role="tab" data-action="tab-proc" data-i="' + i + '" class="' + (i === idx ? 'on' : '') + '">' + esc(pp.codigo) + ' <small>' + ps.avance + '%</small></button>';
    }).join('') + '</div>' +
      '<label class="filter">Mostrar <select data-action="filtro">' +
      [['todos', 'Todos'], ['pend', 'Pendientes'], ['hall', 'Con hallazgo']].map(function (f) { return '<option value="' + f[0] + '"' + (ui.filtro === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') +
      '</select></label></div>';
    var ps = stats(a, [p]);
    h += '<div class="proc-head"><div><h2>' + esc(p.codigo) + ' · ' + esc(p.nombre) + '</h2><p class="muted small">' + esc(p.descripcion || '') + '</p></div>' +
      '<div class="mini-stats"><span>' + ps.C + ' cumple</span><span>' + ps.P + ' parcial</span><span>' + ps.NC + ' no cumple</span><span>' + ps.pend + ' pendientes</span></div></div>' +
      '<div class="meter big"><div style="width:' + ps.avance + '%"></div></div>';
    var n = 0, shown = 0;
    (p.secciones || []).forEach(function (sec) {
      var block = '';
      (sec.items || []).forEach(function (it) {
        n++;
        var r = a.respuestas[it.id] || {};
        if (ui.filtro === 'pend' && r.resultado) return;
        if (ui.filtro === 'hall' && !r.tipo) return;
        shown++;
        block += itemCard(it, r, n);
      });
      if (block) h += '<h3 class="sec-title">' + esc(sec.titulo) + '</h3>' + block;
    });
    if (!shown) h += '<div class="empty small"><p>No hay requisitos que coincidan con el filtro.</p></div>';
    h += '<div class="actions between">' +
      (idx > 0 ? '<button class="btn" data-action="tab-proc" data-i="' + (idx - 1) + '">← ' + esc(a.procesos[idx - 1].codigo) + '</button>' : '<span></span>') +
      (idx < a.procesos.length - 1 ? '<button class="btn primary" data-action="tab-proc" data-i="' + (idx + 1) + '">' + esc(a.procesos[idx + 1].codigo) + ' →</button>'
        : '<a class="btn primary" href="#/auditoria/' + a.id + '/hallazgos">Revisar hallazgos →</a>') + '</div>';
    return h;
  }

  function itemCard(it, r, n) {
    var id = esc(it.id);
    var h = '<div class="item res-' + (r.resultado || 'none') + '">' +
      '<div class="item-head"><span class="num">' + n + '</span><div><p class="q">' + esc(it.pregunta) + '</p>' +
      '<p class="ref">' + (it.referencia ? '<span>Ref.: ' + esc(it.referencia) + '</span>' : '') + (it.evidencia ? '<span>Evidencia sugerida: ' + esc(it.evidencia) + '</span>' : '') + '</p></div></div>' +
      '<div class="seg" role="group" aria-label="Resultado">' + ['C', 'P', 'NC', 'NA'].map(function (k) {
        return '<button type="button" data-action="res" data-item="' + id + '" data-v="' + k + '" class="' + k + (r.resultado === k ? ' on' : '') + '" aria-pressed="' + (r.resultado === k) + '">' + RES_CORTO[k] + '</button>';
      }).join('') + '</div>' +
      '<label class="field"><span>Evidencia objetiva</span><textarea rows="2" data-field="evidencia" data-item="' + id + '" placeholder="Qué viste, revisaste o te dijeron (documento, n.° de HC, fecha, persona)…">' + esc(r.evidencia) + '</textarea></label>';
    if (r.resultado === 'NC' || r.resultado === 'P') {
      h += '<div class="grid-h"><label class="field"><span>Tipo de hallazgo</span><select data-field="tipo" data-item="' + id + '">' +
        Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (r.tipo === k ? ' selected' : '') + '>' + TIPOS[k] + '</option>'; }).join('') +
        '</select></label><label class="field"><span>Descripción del hallazgo</span><textarea rows="2" data-field="hallazgo" data-item="' + id + '" placeholder="Requisito incumplido + evidencia + efecto">' + esc(r.hallazgo) + '</textarea></label></div>';
    }
    return h + '</div>';
  }

  function tipoSelect(attrs, val) {
    return '<select ' + attrs + '>' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (val === k ? ' selected' : '') + '>' + TIPOS[k] + '</option>'; }).join('') + '</select>';
  }

  function vHallazgos(a) {
    var hs = hallazgos(a), c = conteoTipos(hs);
    var h = '<div class="kpis">' + Object.keys(TIPOS).map(function (k) {
      return '<div class="kpi t-' + k + '"><b>' + c[k] + '</b><span>' + TIPOS[k] + '</span></div>';
    }).join('') + '</div>';
    h += '<div class="panel-head"><h2>Hallazgos</h2><button class="btn" data-action="add-extra">+ Hallazgo adicional</button></div>' +
      '<p class="muted small">Se generan solos cuando marcas <b>No cumple</b> o <b>Parcial</b> en la lista de verificación. Aquí puedes ajustar la clasificación y redactarlos.</p>';
    if (!hs.length) return h + '<div class="empty small"><img class="empty-bot" src="img/detecto.png" alt=""><p>Todavía no hay hallazgos. Marca <b>No cumple</b> o <b>Parcial</b> en la lista de verificación y aparecerán aquí.</p></div>';
    var procs = a.procesos.map(function (p) { return p.codigo + ' ' + p.nombre; }).concat(['General']);
    hs.forEach(function (x) {
      h += '<div class="hall t-' + x.tipo + '"><div class="hall-head"><span class="chip">' + esc(x.codigo || 'Adicional') + (x.extra ? '' : ' · req. ' + x.num) + '</span>';
      if (x.extra) {
        h += '<select data-extra="' + esc(x.id) + '" data-k="proceso">' + procs.map(function (p) { return '<option' + (p === x.proceso ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select>' +
          tipoSelect('data-extra="' + esc(x.id) + '" data-k="tipo"', x.tipo) +
          '<button class="btn sm danger-t" data-action="del-extra" data-id="' + esc(x.id) + '">Eliminar</button></div>' +
          '<label class="field"><span>Descripción del hallazgo</span><textarea rows="2" data-extra="' + esc(x.id) + '" data-k="descripcion">' + esc(x.descripcion) + '</textarea></label>' +
          '<div class="grid2"><label class="field"><span>Evidencia</span><textarea rows="2" data-extra="' + esc(x.id) + '" data-k="evidencia">' + esc(x.evidencia) + '</textarea></label>' +
          '<label class="field"><span>Requisito / referencia</span><input data-extra="' + esc(x.id) + '" data-k="referencia" value="' + esc(x.referencia) + '"></label></div>';
      } else {
        h += '<span class="badge r-' + x.resultado + '">' + RES[x.resultado] + '</span>' + tipoSelect('data-field="tipo" data-item="' + esc(x.id) + '"', x.tipo) + '</div>' +
          '<p class="q">' + esc(x.requisito) + '</p><p class="ref">' + esc(x.referencia) + '</p>' +
          '<label class="field"><span>Descripción del hallazgo</span><textarea rows="2" data-field="hallazgo" data-item="' + esc(x.id) + '" placeholder="Requisito incumplido + evidencia + efecto">' + esc(x.descripcion) + '</textarea></label>' +
          '<label class="field"><span>Evidencia</span><textarea rows="2" data-field="evidencia" data-item="' + esc(x.id) + '">' + esc(x.evidencia) + '</textarea></label>';
      }
      h += '</div>';
    });
    return h + '<div class="actions end"><a class="btn primary" href="#/auditoria/' + a.id + '/informe">Ver informe →</a></div>';
  }

  function vSeguimiento(a) {
    var hs = hallazgos(a).filter(function (x) { return ui.incluirObs || requiereAccion(x); });
    var cerr = hs.filter(function (x) { return accionCerrada(a.acciones[x.id]); }).length;
    var pct = hs.length ? Math.round(cerr / hs.length * 100) : 0;
    var h = '<div class="panel-head"><div><h2>Plan de acción y seguimiento</h2><p class="muted small">Para cada no conformidad: causa raíz (5 porqués o Ishikawa), acción correctiva, responsable, fecha límite y verificación de eficacia.</p></div>' +
      '<label class="check"><input type="checkbox" data-action="incluir-obs"' + (ui.incluirObs ? ' checked' : '') + '> Incluir observaciones y oportunidades de mejora</label></div>' +
      '<div class="meter big"><div style="width:' + pct + '%"></div></div><p class="small">' + cerr + ' de ' + hs.length + ' acciones implementadas (' + pct + '%)</p>';
    if (!hs.length) h += '<div class="empty small"><p>No hay hallazgos que requieran acción.</p></div>';
    hs.forEach(function (x) {
      var acc = a.acciones[x.id] || {}, hid = esc(x.id);
      h += '<div class="hall t-' + x.tipo + '"><div class="hall-head"><span class="chip">' + esc(x.codigo || 'Adicional') + '</span><span class="badge t-' + x.tipo + '">' + TIPOS[x.tipo] + '</span></div>' +
        '<p class="q">' + esc(x.descripcion || x.requisito) + '</p>' +
        '<label class="field"><span>Causa raíz</span><textarea rows="2" data-acc="' + hid + '" data-k="causa" placeholder="¿Por qué ocurrió? Pregunta 5 veces por qué…">' + esc(acc.causa) + '</textarea></label>' +
        '<label class="field"><span>Acción correctiva</span><textarea rows="2" data-acc="' + hid + '" data-k="accion">' + esc(acc.accion) + '</textarea></label>' +
        '<div class="grid3"><label class="field"><span>Responsable</span><input data-acc="' + hid + '" data-k="responsable" value="' + esc(acc.responsable) + '"></label>' +
        '<label class="field"><span>Fecha límite</span><input type="date" data-acc="' + hid + '" data-k="fecha" value="' + esc(acc.fecha) + '"></label>' +
        '<label class="field"><span>Estado</span><select data-acc="' + hid + '" data-k="estado">' + ESTADOS_ACC.map(function (e) { return '<option' + ((acc.estado || 'Pendiente') === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="field"><span>Evidencia de cierre / verificación</span><textarea rows="2" data-acc="' + hid + '" data-k="cierre">' + esc(acc.cierre) + '</textarea></label></div>';
    });
    h += '<div class="actions end">' + (a.estado === 'cerrada'
      ? '<button class="btn" data-action="estado" data-v="ejec">Reabrir auditoría</button>'
      : '<button class="btn primary" data-action="estado" data-v="cerrada">Cerrar auditoría</button>') + '</div>';
    return h;
  }

  function vInforme(a, s) {
    var hs = hallazgos(a), c = conteoTipos(hs), nv = nivel(s.pct);
    var h = '<div class="actions end no-print"><button class="btn" data-action="csv" data-id="' + a.id + '">Exportar Excel (.csv)</button>' +
      '<button class="btn primary" data-action="imprimir">Imprimir / Guardar PDF</button></div>';
    h += '<article class="report">' +
      '<header class="rep-head"><div class="rep-brand"><img src="img/detecto-cara.png" alt=""><div><p class="muted small">INFORME DE AUDITORÍA ' + esc((a.tipo || '').toUpperCase()) + '</p><h1>' + esc(a.titulo || 'Auditoría') + '</h1><p>' + esc(a.organizacion) + '</p></div></div>' +
      '<div class="score ' + nv.c + '"><b>' + (s.pct == null ? '—' : s.pct + '%') + '</b><span>' + nv.t + '</span></div></header>' +
      '<h2>1. Datos generales</h2><table class="kv"><tbody>' +
      kv('Área auditada', a.area) + kv('Auditor líder', a.auditorLider) + kv('Equipo auditor', a.equipo) +
      kv('Fechas', fecha(a.fechaInicio) + ' – ' + fecha(a.fechaFin), true) + kv('Auditados / entrevistados', a.auditados) + kv('Estado', ESTADOS_AUD[a.estado]) +
      '</tbody></table>' +
      '<h2>2. Objetivo, alcance y criterios</h2>' +
      '<h3>Objetivo</h3><p>' + nl(a.objetivo || '—') + '</p><h3>Alcance</h3><p>' + nl(a.alcance || '—') + '</p>' +
      '<h3>Criterios</h3><p>' + nl(a.criterios || '—') + '</p>' +
      '<h2>3. Resumen de resultados</h2><table class="data"><thead><tr><th>Proceso</th><th>Req.</th><th>C</th><th>P</th><th>NC</th><th>N/A</th><th>Pend.</th><th>Cumplimiento</th></tr></thead><tbody>';
    a.procesos.forEach(function (p) {
      var ps = stats(a, [p]), pn = nivel(ps.pct);
      h += '<tr><td>' + esc(p.codigo) + ' ' + esc(p.nombre) + '</td><td>' + ps.total + '</td><td>' + ps.C + '</td><td>' + ps.P + '</td><td>' + ps.NC + '</td><td>' + ps.NA + '</td><td>' + ps.pend + '</td>' +
        '<td><div class="bar"><div class="' + pn.c + '" style="width:' + (ps.pct || 0) + '%"></div></div><span class="small">' + (ps.pct == null ? '—' : ps.pct + '% ' + pn.t) + '</span></td></tr>';
    });
    h += '<tr class="total"><td>Total</td><td>' + s.total + '</td><td>' + s.C + '</td><td>' + s.P + '</td><td>' + s.NC + '</td><td>' + s.NA + '</td><td>' + s.pend + '</td><td>' + (s.pct == null ? '—' : s.pct + '%') + '</td></tr></tbody></table>' +
      '<p class="small muted">Cumplimiento = (Cumple + 0,5 × Parcial) ÷ requisitos evaluados (no incluye N/A ni pendientes). Escala: ≥90% satisfactorio · 75–89% aceptable · 50–74% en desarrollo · &lt;50% crítico.</p>' +
      '<div class="kpis">' + Object.keys(TIPOS).map(function (k) { return '<div class="kpi t-' + k + '"><b>' + c[k] + '</b><span>' + TIPOS[k] + '</span></div>'; }).join('') + '</div>' +
      '<h2>4. Detalle de hallazgos</h2>';
    if (!hs.length) h += '<p>No se registraron hallazgos.</p>';
    else {
      h += '<table class="data"><thead><tr><th>N.°</th><th>Proceso</th><th>Tipo</th><th>Hallazgo</th><th>Evidencia</th></tr></thead><tbody>';
      hs.forEach(function (x, i) {
        h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.codigo || x.proceso) + '</td><td><span class="badge t-' + x.tipo + '">' + TIPOS[x.tipo] + '</span></td><td>' + nl(x.descripcion || x.requisito) +
          (x.referencia ? '<br><span class="muted small">Ref.: ' + esc(x.referencia) + '</span>' : '') + '</td><td>' + nl(x.evidencia || '—') + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<h2>5. Fortalezas</h2>' + editable(a, 'fortalezas', 'Buenas prácticas observadas…') +
      '<h2>6. Conclusiones y recomendaciones</h2>' + editable(a, 'conclusiones', '¿El sistema auditado cumple y es eficaz? Recomendaciones principales…');
    var acciones = hs.filter(function (x) { return a.acciones[x.id] && (a.acciones[x.id].accion || a.acciones[x.id].responsable); });
    h += '<h2>7. Plan de acción</h2>';
    if (!acciones.length) h += '<p class="muted">Pendiente de definir en la etapa 5 (Seguimiento).</p>';
    else {
      h += '<table class="data"><thead><tr><th>Hallazgo</th><th>Causa raíz</th><th>Acción</th><th>Responsable</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>';
      acciones.forEach(function (x) {
        var ac = a.acciones[x.id];
        h += '<tr><td>' + esc(x.codigo) + ' ' + nl((x.descripcion || x.requisito).slice(0, 140)) + '</td><td>' + nl(ac.causa) + '</td><td>' + nl(ac.accion) + '</td><td>' + esc(ac.responsable) + '</td><td>' + fecha(ac.fecha) + '</td><td>' + esc(ac.estado || 'Pendiente') + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<div class="firmas"><div><span></span>Auditor líder<br><b>' + esc(a.auditorLider) + '</b></div><div><span></span>Responsable del área auditada</div></div>' +
      '<p class="small muted rep-foot">Generado con AuditaProcesos con Detecto · ' + fecha(hoy()) + '</p></article>';
    return h;
  }
  function kv(k, v, raw) { return '<tr><th>' + k + '</th><td>' + (raw ? v : nl(v || '—')) + '</td></tr>'; }
  function editable(a, f, ph) {
    return '<textarea class="no-print rep-edit" rows="4" data-afield="' + f + '" placeholder="' + ph + '">' + esc(a[f]) + '</textarea>' +
      '<p class="print-only">' + nl(a[f] || '—') + '</p>';
  }

  function vPlantillas() {
    var h = '<section class="page-head"><div><h1>Plantillas</h1><p class="sub">Listas de verificación reutilizables. Las plantillas base se pueden duplicar para adaptarlas; las tuyas se pueden editar y compartir.</p></div>' +
      '<div class="actions"><button class="btn" data-action="importar-tpl">Importar .json</button><button class="btn primary" data-action="nueva-tpl">+ Nueva plantilla</button></div></section><div class="cards">';
    plantillas().forEach(function (p) {
      var base = esBase(p.id);
      h += '<article class="card"><div class="card-top"><span class="chip">' + esc(p.codigo) + '</span><span class="muted small">' + (base ? 'Base' : 'Propia') + ' · ' + itemsDe(p).length + ' requisitos</span></div>' +
        '<h3>' + esc(p.nombre) + '</h3><p class="muted small">' + esc(p.descripcion || p.area || '') + '</p>' +
        '<div class="card-actions"><a class="btn sm" href="#/plantilla/' + esc(p.id) + '">' + (base ? 'Ver' : 'Editar') + '</a>' +
        '<button class="btn sm" data-action="dup-tpl" data-id="' + esc(p.id) + '">Duplicar</button>' +
        '<button class="btn sm" data-action="exp-tpl" data-id="' + esc(p.id) + '">Exportar</button>' +
        (base ? '' : '<button class="btn sm danger-t" data-action="del-tpl" data-id="' + esc(p.id) + '">Eliminar</button>') + '</div></article>';
    });
    return h + '</div>';
  }

  function vPlantilla(id) {
    var src = getPlantilla(id);
    if (!src) return vNoEncontrado();
    var base = esBase(id);
    if (!ui.draft || ui.draft.id !== id) ui.draft = clone(src);
    var d = ui.draft;
    var ro = base ? ' readonly' : '';
    var h = '<section class="page-head"><div><a class="back" href="#/plantillas">← Plantillas</a><h1>' + esc(d.codigo) + ' · ' + esc(d.nombre) + '</h1>' +
      (base ? '<p class="sub">Plantilla base (solo lectura). Duplícala para modificarla.</p>' : '<p class="sub">Los cambios no afectan a las auditorías ya creadas.</p>') + '</div>' +
      '<div class="actions">' + (base ? '<button class="btn primary" data-action="dup-tpl" data-id="' + esc(id) + '">Duplicar para editar</button>'
        : '<button class="btn primary" data-action="save-tpl">Guardar plantilla</button>') + '</div></section>';
    h += '<div class="panel"><div class="grid2">' +
      '<label class="field"><span>Código</span><input data-d="codigo" value="' + esc(d.codigo) + '"' + ro + '></label>' +
      '<label class="field"><span>Nombre del proceso</span><input data-d="nombre" value="' + esc(d.nombre) + '"' + ro + '></label>' +
      '<label class="field"><span>Área</span><input data-d="area" value="' + esc(d.area) + '"' + ro + '></label>' +
      '<label class="field"><span>Descripción</span><input data-d="descripcion" value="' + esc(d.descripcion) + '"' + ro + '></label></div>' +
      '<label class="field"><span>Criterios / normas (una por línea)</span><textarea rows="3" data-d="criterios"' + ro + '>' + esc((d.criterios || []).join('\n')) + '</textarea></label></div>';
    (d.secciones || []).forEach(function (s, i) {
      h += '<div class="panel"><div class="panel-head"><label class="field grow"><span>Sección ' + (i + 1) + '</span><input data-d="secciones.' + i + '.titulo" value="' + esc(s.titulo) + '"' + ro + '></label>' +
        (base ? '' : '<button class="btn sm danger-t" data-action="del-sec" data-i="' + i + '">Quitar sección</button>') + '</div>';
      (s.items || []).forEach(function (it, j) {
        h += '<div class="tpl-item"><span class="num">' + (j + 1) + '</span><div class="grow">' +
          '<textarea rows="2" data-d="secciones.' + i + '.items.' + j + '.pregunta" placeholder="Requisito a verificar"' + ro + '>' + esc(it.pregunta) + '</textarea>' +
          '<div class="grid2"><input data-d="secciones.' + i + '.items.' + j + '.referencia" value="' + esc(it.referencia) + '" placeholder="Referencia (ej.: PR-01 act. 3)"' + ro + '>' +
          '<input data-d="secciones.' + i + '.items.' + j + '.evidencia" value="' + esc(it.evidencia) + '" placeholder="Evidencia sugerida"' + ro + '></div></div>' +
          (base ? '' : '<button class="btn sm icon danger-t" title="Quitar" aria-label="Quitar requisito" data-action="del-item" data-i="' + i + '" data-j="' + j + '">✕</button>') + '</div>';
      });
      if (!base) h += '<button class="btn sm" data-action="add-item" data-i="' + i + '">+ Requisito</button>';
      h += '</div>';
    });
    if (!base) h += '<div class="actions between"><button class="btn" data-action="add-sec">+ Sección</button><button class="btn primary" data-action="save-tpl">Guardar plantilla</button></div>';
    return h;
  }

  function vMetodologia() {
    var et = [
      ['Planificación', 'Define el objetivo, el alcance (procesos, áreas, periodo), los criterios (procedimientos y normas), el equipo auditor y las fechas. Avisa al área auditada.'],
      ['Lista de verificación y ejecución', 'Convierte cada actividad del procedimiento en un requisito verificable. En campo usa tres técnicas: observación, entrevista y revisión de registros (muestra). Registra la evidencia objetiva: qué viste, dónde, cuándo y a quién.'],
      ['Hallazgos', 'Clasifica lo encontrado: <b>no conformidad mayor</b> (incumple un requisito legal, afecta al paciente o la falla es sistemática), <b>no conformidad menor</b> (incumplimiento puntual), <b>observación</b> (riesgo de incumplir) u <b>oportunidad de mejora</b>. Redacta: requisito + evidencia + efecto.'],
      ['Informe', 'Resume resultados, nivel de cumplimiento, hallazgos, fortalezas y conclusiones. Preséntalo en la reunión de cierre y recoge las firmas.'],
      ['Seguimiento', 'El área analiza la causa raíz (5 porqués o Ishikawa) y propone acciones con responsable y fecha. El auditor verifica que se implementaron y que fueron eficaces.']
    ];
    var h = '<section class="page-head"><div><h1>Metodología</h1><p class="sub">Basada en las etapas de la ISO 19011 (directrices para auditar sistemas de gestión).</p></div></section><ol class="steps">';
    et.forEach(function (e, i) { h += '<li><b class="n">' + (i + 1) + '</b><div><h3>' + e[0] + '</h3><p>' + e[1] + '</p></div></li>'; });
    h += '</ol><div class="panel"><h2>Cómo se calcula el cumplimiento</h2><p>Cumplimiento = (Cumple + 0,5 × Parcial) ÷ requisitos evaluados. Los requisitos "No aplica" y los pendientes no cuentan.</p>' +
      '<table class="data"><thead><tr><th>Rango</th><th>Nivel</th></tr></thead><tbody><tr><td>≥ 90%</td><td><span class="lvl ok">Satisfactorio</span></td></tr><tr><td>75 – 89%</td><td><span class="lvl good">Aceptable</span></td></tr><tr><td>50 – 74%</td><td><span class="lvl warn">En desarrollo</span></td></tr><tr><td>&lt; 50%</td><td><span class="lvl bad">Crítico</span></td></tr></tbody></table></div>' +
      '<div class="panel"><h2>Trabajo en equipo</h2><p>Cada auditor trabaja en su navegador. Para compartir una auditoría, usa <b>Exportar .json</b> y envía el archivo; la otra persona lo abre con <b>Importar .json</b>. Las plantillas se comparten igual.</p></div>';
    return h;
  }

  // ---------- Acciones ----------
  function setPath(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }

  function currentAud() { var p = parts(); return p[0] === 'auditoria' ? getAud(p[1]) : null; }

  function setResultado(a, itemId, v) {
    var r = a.respuestas[itemId] || (a.respuestas[itemId] = {});
    r.resultado = r.resultado === v ? '' : v;
    if (r.resultado === 'NC') r.tipo = (r.tipo === 'NCM' || r.tipo === 'NCm') ? r.tipo : 'NCm';
    else if (r.resultado === 'P') r.tipo = r.tipo || 'OBS';
    else r.tipo = '';
    if (a.estado === 'plan') a.estado = 'ejec';
    touch(a);
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type === 'checkbox')) return;
    var act = b.getAttribute('data-action'), a = currentAud(), id = b.getAttribute('data-id');
    switch (act) {
      case 'res': {
        var y = window.scrollY;
        setResultado(a, b.getAttribute('data-item'), b.getAttribute('data-v'));
        render(); window.scrollTo(0, y); break;
      }
      case 'tab-proc': ui.proc[a.id] = +b.getAttribute('data-i'); render(); window.scrollTo(0, 0); break;
      case 'add-extra':
        a.extras = a.extras || [];
        a.extras.push({ id: uid('hx'), proceso: a.procesos[0] ? a.procesos[0].codigo + ' ' + a.procesos[0].nombre : 'General', tipo: 'OBS', descripcion: '', evidencia: '', referencia: '' });
        touch(a); render(); break;
      case 'del-extra':
        if (confirm('¿Eliminar este hallazgo adicional?')) { a.extras = a.extras.filter(function (x) { return x.id !== id; }); delete a.acciones[id]; touch(a); render(); }
        break;
      case 'estado': a.estado = b.getAttribute('data-v'); touch(a); render(); toast(a.estado === 'cerrada' ? 'Auditoría cerrada' : 'Auditoría reabierta'); break;
      case 'imprimir': window.print(); break;
      case 'csv': exportCSV(getAud(id)); break;
      case 'exportar-aud': {
        var ea = getAud(id);
        download(slug(ea.titulo) + '.auditoria.json', JSON.stringify({ tipo: 'auditoria', app: 'AuditaProcesos', data: ea }, null, 2), 'application/json');
        break;
      }
      case 'duplicar-aud': {
        var c = clone(getAud(id)); c.id = uid('aud'); c.titulo = (c.titulo || 'Auditoría') + ' (copia)';
        c.respuestas = {}; c.extras = []; c.acciones = {}; c.estado = 'plan'; c.fortalezas = ''; c.conclusiones = '';
        c.creado = c.actualizado = new Date().toISOString();
        db.auditorias.push(c); save(true); render(); toast('Duplicada sin respuestas, lista para una nueva auditoría');
        break;
      }
      case 'eliminar-aud':
        if (confirm('¿Eliminar esta auditoría de este navegador? Esta acción no se puede deshacer. Exporta un .json antes si quieres conservarla.')) {
          db.auditorias = db.auditorias.filter(function (x) { return x.id !== id; }); save(true); render();
        }
        break;
      case 'importar-aud': ui.fileMode = 'aud'; openFile(); break;
      case 'importar-tpl': ui.fileMode = 'tpl'; openFile(); break;
      case 'nueva-tpl': {
        var t = { id: uid('tpl'), codigo: 'PR-XX', nombre: 'Nuevo proceso', area: '', descripcion: '', criterios: [], secciones: [{ titulo: 'Sección 1', items: [{ id: uid('it'), pregunta: '', referencia: '', evidencia: '' }] }] };
        db.plantillas.push(t); save(true); location.hash = '#/plantilla/' + t.id; break;
      }
      case 'dup-tpl': {
        var o = clone(getPlantilla(id)); o.id = uid('tpl'); o.codigo = o.codigo; o.nombre = o.nombre + ' (copia)';
        o.secciones.forEach(function (s) { s.items.forEach(function (it) { it.id = uid('it'); }); });
        db.plantillas.push(o); save(true); location.hash = '#/plantilla/' + o.id; toast('Plantilla duplicada. Ya puedes editarla.'); break;
      }
      case 'exp-tpl': {
        var tp = getPlantilla(id);
        download(slug(tp.codigo + '-' + tp.nombre) + '.plantilla.json', JSON.stringify({ tipo: 'plantilla', app: 'AuditaProcesos', data: tp }, null, 2), 'application/json');
        break;
      }
      case 'del-tpl':
        if (confirm('¿Eliminar esta plantilla? Las auditorías ya creadas no se verán afectadas.')) { db.plantillas = db.plantillas.filter(function (x) { return x.id !== id; }); save(true); render(); }
        break;
      case 'add-sec': ui.draft.secciones.push({ titulo: 'Nueva sección', items: [{ id: uid('it'), pregunta: '', referencia: '', evidencia: '' }] }); render(); break;
      case 'del-sec': if (confirm('¿Quitar la sección y sus requisitos?')) { ui.draft.secciones.splice(+b.getAttribute('data-i'), 1); render(); } break;
      case 'add-item': ui.draft.secciones[+b.getAttribute('data-i')].items.push({ id: uid('it'), pregunta: '', referencia: '', evidencia: '' }); render(); break;
      case 'del-item': ui.draft.secciones[+b.getAttribute('data-i')].items.splice(+b.getAttribute('data-j'), 1); render(); break;
      case 'save-tpl': {
        var d = ui.draft;
        d.secciones.forEach(function (s) { s.items = s.items.filter(function (it) { return (it.pregunta || '').trim(); }); });
        d.secciones = d.secciones.filter(function (s) { return s.items.length; });
        if (!d.secciones.length) { toast('Agrega al menos un requisito'); break; }
        var i = db.plantillas.findIndex(function (x) { return x.id === d.id; });
        if (i >= 0) db.plantillas[i] = clone(d);
        save(true); toast('Plantilla guardada'); render(); break;
      }
    }
  });

  function onField(e) {
    var t = e.target, a;
    if (t.hasAttribute('data-item') && t.hasAttribute('data-field')) {
      a = currentAud(); if (!a) return;
      var r = a.respuestas[t.getAttribute('data-item')] || (a.respuestas[t.getAttribute('data-item')] = {});
      r[t.getAttribute('data-field')] = t.value; touch(a);
      if (e.type === 'change' && t.tagName === 'SELECT') render();
    } else if (t.hasAttribute('data-extra')) {
      a = currentAud();
      var x = (a.extras || []).filter(function (z) { return z.id === t.getAttribute('data-extra'); })[0];
      if (x) { x[t.getAttribute('data-k')] = t.value; touch(a); if (e.type === 'change' && t.tagName === 'SELECT') render(); }
    } else if (t.hasAttribute('data-acc')) {
      a = currentAud();
      var hid = t.getAttribute('data-acc');
      var acc = a.acciones[hid] || (a.acciones[hid] = { estado: 'Pendiente' });
      acc[t.getAttribute('data-k')] = t.value; touch(a);
      if (e.type === 'change' && t.tagName === 'SELECT') { var y = window.scrollY; render(); window.scrollTo(0, y); }
    } else if (t.hasAttribute('data-afield')) {
      a = currentAud(); a[t.getAttribute('data-afield')] = t.value; touch(a);
    } else if (t.hasAttribute('data-d') && ui.draft) {
      var path = t.getAttribute('data-d');
      setPath(ui.draft, path, path === 'criterios' ? t.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : t.value);
    } else if (t.getAttribute('data-action') === 'filtro' && e.type === 'change') {
      ui.filtro = t.value; render();
    } else if (t.getAttribute('data-action') === 'incluir-obs' && e.type === 'change') {
      ui.incluirObs = t.checked; render();
    }
  }
  app.addEventListener('input', function (e) { if (e.target.tagName !== 'SELECT' && e.target.type !== 'checkbox') onField(e); });
  app.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onField(e); });

  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'form-datos') return;
    e.preventDefault();
    var f = e.target, fd = new FormData(f);
    var a = f.getAttribute('data-id') ? getAud(f.getAttribute('data-id')) : null;
    var nueva = !a;
    a = a || nuevaAuditoria();
    ['titulo', 'organizacion', 'area', 'tipo', 'auditorLider', 'equipo', 'fechaInicio', 'fechaFin', 'auditados', 'objetivo', 'alcance', 'criterios'].forEach(function (k) { a[k] = (fd.get(k) || '').toString(); });
    var ids = fd.getAll('plantillas');
    if (!ids.length) { toast('Elige al menos un proceso a auditar'); return; }
    var actuales = a.procesos.map(function (p) { return p.plantillaId; });
    var quitar = a.procesos.filter(function (p) { return ids.indexOf(p.plantillaId) < 0; });
    var conResp = quitar.filter(function (p) { return itemsDe(p).some(function (it) { return a.respuestas[it.id] && a.respuestas[it.id].resultado; }); });
    if (conResp.length && !confirm('Vas a quitar ' + conResp.map(function (p) { return p.codigo; }).join(', ') + ', que ya tiene respuestas. ¿Continuar?')) return;
    a.procesos = a.procesos.filter(function (p) { return ids.indexOf(p.plantillaId) >= 0; });
    ids.forEach(function (pid) {
      if (actuales.indexOf(pid) >= 0) return;
      var t = clone(getPlantilla(pid));
      a.procesos.push({ plantillaId: pid, codigo: t.codigo, nombre: t.nombre, descripcion: t.descripcion, area: t.area, criterios: t.criterios || [], secciones: t.secciones });
    });
    if (!a.criterios.trim()) {
      var cs = [];
      a.procesos.forEach(function (p) { (p.criterios || []).forEach(function (c) { if (cs.indexOf(c) < 0) cs.push(c); }); });
      a.criterios = cs.join('\n');
    }
    if (!a.alcance.trim()) a.alcance = 'Procesos: ' + a.procesos.map(function (p) { return p.codigo + ' ' + p.nombre; }).join('; ') + '.';
    if (nueva) db.auditorias.push(a);
    touch(a); save(true);
    if (nueva) location.hash = '#/auditoria/' + a.id + '/ejecucion';
    else { toast('Cambios guardados'); render(); }
  });

  // ---------- Importar / exportar ----------
  var fileInput = document.getElementById('file-input');
  function openFile() { fileInput.value = ''; fileInput.click(); }
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0]; if (!file) return;
    var rd = new FileReader();
    rd.onload = function () {
      var obj;
      try { obj = JSON.parse(rd.result); } catch (e) { toast('El archivo no es un JSON válido'); return; }
      var data = obj && obj.data ? obj.data : obj;
      if (ui.fileMode === 'aud') importarAud(data); else importarTpl(data);
    };
    rd.readAsText(file);
  });
  function importarAud(d) {
    if (!d || !Array.isArray(d.procesos) || typeof d.respuestas !== 'object') { toast('El archivo no es una auditoría de AuditaProcesos'); return; }
    d.extras = d.extras || []; d.acciones = d.acciones || {};
    var ex = getAud(d.id);
    if (ex) {
      if (confirm('Ya existe "' + (ex.titulo || 'esta auditoría') + '" en este navegador.\n\nAceptar = reemplazarla con el archivo.\nCancelar = importarla como copia.')) {
        db.auditorias = db.auditorias.filter(function (x) { return x.id !== d.id; });
      } else { d.id = uid('aud'); d.titulo = (d.titulo || '') + ' (importada)'; }
    }
    if (!d.id) d.id = uid('aud');
    db.auditorias.push(d); save(true); location.hash = '#/auditoria/' + d.id + '/ejecucion'; render(); toast('Auditoría importada');
  }
  function importarTpl(d) {
    var arr = Array.isArray(d) ? d : [d], n = 0;
    arr.forEach(function (t) {
      if (!t || !Array.isArray(t.secciones)) return;
      t = clone(t);
      if (!t.id || getPlantilla(t.id)) t.id = uid('tpl');
      t.secciones.forEach(function (s) { (s.items || []).forEach(function (it) { if (!it.id) it.id = uid('it'); }); });
      db.plantillas.push(t); n++;
    });
    save(true); render(); toast(n ? n + ' plantilla(s) importada(s)' : 'No se encontró ninguna plantilla válida');
  }
  function exportCSV(a) {
    var rows = [['Proceso', 'Sección', 'N.°', 'Requisito', 'Referencia', 'Resultado', 'Evidencia', 'Tipo de hallazgo', 'Hallazgo', 'Causa raíz', 'Acción correctiva', 'Responsable', 'Fecha límite', 'Estado acción']];
    a.procesos.forEach(function (p) {
      var n = 0;
      p.secciones.forEach(function (s) {
        s.items.forEach(function (it) {
          n++;
          var r = a.respuestas[it.id] || {}, ac = a.acciones[it.id] || {};
          rows.push([p.codigo + ' ' + p.nombre, s.titulo, n, it.pregunta, it.referencia, RES[r.resultado] || 'Pendiente', r.evidencia, TIPOS[r.tipo] || '', r.hallazgo, ac.causa, ac.accion, ac.responsable, ac.fecha, r.tipo ? (ac.estado || 'Pendiente') : '']);
        });
      });
    });
    (a.extras || []).forEach(function (x) {
      var ac = a.acciones[x.id] || {};
      rows.push([x.proceso, 'Hallazgo adicional', '+', '', x.referencia, '', x.evidencia, TIPOS[x.tipo], x.descripcion, ac.causa, ac.accion, ac.responsable, ac.fecha, ac.estado || 'Pendiente']);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { c = c == null ? '' : String(c); return /[;"\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';');
    }).join('\r\n');
    download(slug(a.titulo) + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
  }

  // ---------- Inicio ----------
  load();
  render();
})();
