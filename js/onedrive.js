/* Conexión con OneDrive / SharePoint mediante Microsoft Graph.
 * Usa MSAL (inicio de sesión de Microsoft) cargado desde js/vendor/.
 * Requiere registrar una aplicación en Microsoft Entra (ver README → "Guardar en OneDrive").
 */
(function () {
  'use strict';
  var GRAPH = 'https://graph.microsoft.com/v1.0';
  var cfg = {}, pca = null, ready = null, account = null, siteDrive = null;

  function baseDir() { return location.origin + location.pathname.replace(/[^/]*$/, ''); }
  function scopes() {
    return cfg.sharepoint ? ['User.Read', 'Files.ReadWrite.All', 'Sites.Read.All'] : ['User.Read', 'Files.ReadWrite'];
  }
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.msal) return ok();
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('No se pudo cargar la librería de Microsoft.')); };
      document.head.appendChild(s);
    });
  }

  function setConfig(c) {
    var nuevo = JSON.stringify(c || {});
    if (nuevo === JSON.stringify(cfg)) return;
    cfg = JSON.parse(nuevo);
    pca = null; ready = null; account = null; siteDrive = null;
    if (configurado()) init().catch(function () { /* se informa al usar */ });
  }
  function configurado() { return !!(cfg.clientId && /^[0-9a-f-]{36}$/i.test(cfg.clientId.trim())); }

  function init() {
    if (ready) return ready;
    ready = loadScript('js/vendor/msal-browser.min.js').then(function () {
      pca = new window.msal.PublicClientApplication({
        auth: {
          clientId: cfg.clientId.trim(),
          authority: 'https://login.microsoftonline.com/' + ((cfg.tenant || 'common').trim() || 'common'),
          redirectUri: baseDir() + 'auth.html'
        },
        cache: { cacheLocation: 'localStorage' }
      });
      return pca.initialize();
    }).then(function () {
      return pca.handleRedirectPromise().catch(function () { return null; });
    }).then(function () {
      var accs = pca.getAllAccounts();
      account = accs.length ? accs[0] : null;
    });
    ready.catch(function () { ready = null; });
    return ready;
  }

  function login() {
    if (!configurado()) return Promise.reject(new Error('Falta configurar el ID de la aplicación de Microsoft.'));
    return init().then(function () {
      return pca.loginPopup({ scopes: scopes(), prompt: 'select_account' });
    }).then(function (r) { account = r.account; pca.setActiveAccount(account); return account; });
  }
  function logout() {
    if (!pca || !account) { account = null; return Promise.resolve(); }
    var acc = account; account = null;
    return pca.logoutPopup({ account: acc, mainWindowRedirectUri: baseDir() }).catch(function () {});
  }
  function cuenta() { return account ? { nombre: account.name || account.username, correo: account.username } : null; }

  function token() {
    return init().then(function () {
      if (!account) return login().then(function () { return token(); });
      return pca.acquireTokenSilent({ scopes: scopes(), account: account }).then(function (r) { return r.accessToken; })
        .catch(function () { return pca.acquireTokenPopup({ scopes: scopes(), account: account }).then(function (r) { return r.accessToken; }); });
    });
  }

  function graph(method, path, body, contentType) {
    return token().then(function (t) {
      var h = { Authorization: 'Bearer ' + t };
      if (contentType) h['Content-Type'] = contentType;
      return fetch(path.indexOf('http') === 0 ? path : GRAPH + path, { method: method, headers: h, body: body });
    }).then(function (res) {
      if (res.ok) return res.status === 204 ? null : (res.headers.get('content-type') || '').indexOf('json') >= 0 ? res.json() : res.text();
      return res.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(mensajeError(res.status, j));
        e.status = res.status; e.code = j && j.error && j.error.code;
        throw e;
      });
    });
  }
  function mensajeError(status, j) {
    var code = j && j.error && j.error.code;
    if (status === 401 || status === 403) return 'Microsoft no dio permiso para acceder a la carpeta (' + (code || status) + '). Puede que Sistemas deba aprobar los permisos.';
    if (status === 404) return 'No se encontró la carpeta o el sitio de SharePoint configurado.';
    return 'Error de OneDrive: ' + ((j && j.error && j.error.message) || status);
  }

  // Unidad de destino: OneDrive del usuario o biblioteca de un sitio de SharePoint.
  function drive() {
    if (!cfg.sharepoint) return Promise.resolve('/me/drive');
    if (siteDrive) return Promise.resolve(siteDrive);
    var sp = cfg.sharepoint.trim().replace(/^https?:\/\//, '');
    var i = sp.indexOf('/');
    var ruta = i < 0 ? sp : sp.slice(0, i) + ':' + sp.slice(i);
    return graph('GET', '/sites/' + ruta).then(function (s) { siteDrive = '/sites/' + s.id + '/drive'; return siteDrive; });
  }
  function enc(path) { return path.split('/').map(encodeURIComponent).join('/'); }
  function limpiar(n) { return String(n).replace(/["*:<>?\/\\|#%]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 120) || 'Sin nombre'; }

  function asegurarCarpeta(d, segs) {
    var p = Promise.resolve(), actual = '';
    segs.forEach(function (seg) {
      var padre = actual;
      actual = actual ? actual + '/' + seg : seg;
      p = p.then(function () {
        var url = d + (padre ? '/root:/' + enc(padre) + ':/children' : '/root/children');
        return graph('POST', url, JSON.stringify({ name: seg, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }), 'application/json')
          .catch(function (e) { if (e.status !== 409) throw e; });
      });
    });
    return p.then(function () { return actual; });
  }

  /* Guarda varios archivos en <carpeta base>/<subcarpetas...>/
   * files: [{ nombre, contenido, tipo }] */
  function guardar(subcarpetas, files) {
    var d;
    var segs = limpiar(cfg.carpeta || 'Auditorías').split('/').concat(subcarpetas.map(limpiar));
    return drive().then(function (x) { d = x; return asegurarCarpeta(d, segs); }).then(function (ruta) {
      return files.reduce(function (p, f) {
        return p.then(function () {
          return graph('PUT', d + '/root:/' + enc(ruta + '/' + limpiar(f.nombre)) + ':/content', f.contenido, f.tipo);
        });
      }, Promise.resolve()).then(function () {
        return graph('GET', d + '/root:/' + enc(ruta));
      }).then(function (item) { return { ruta: ruta, url: item.webUrl }; });
    });
  }

  // Lista los respaldos .json de auditorías guardados en la carpeta base.
  function listar() {
    var d, base = limpiar(cfg.carpeta || 'Auditorías');
    return drive().then(function (x) {
      d = x;
      return graph('GET', d + '/root:/' + enc(base) + ':/search(q=\'respaldo\')?$top=200');
    }).then(function (r) {
      return (r.value || []).filter(function (it) { return it.file && /_respaldo\.json$/i.test(it.name); })
        .map(function (it) {
          return {
            id: it.id, nombre: it.name, fecha: it.lastModifiedDateTime,
            por: it.lastModifiedBy && it.lastModifiedBy.user ? it.lastModifiedBy.user.displayName : '',
            carpeta: it.parentReference && it.parentReference.path ? decodeURIComponent(it.parentReference.path.split(':').slice(1).join(':')).replace(/^\//, '') : ''
          };
        })
        .sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || ''); });
    }).catch(function (e) { if (e.status === 404) return []; throw e; });
  }
  function descargar(id) {
    return drive().then(function (d) { return graph('GET', d + '/items/' + id); })
      .then(function (it) { return fetch(it['@microsoft.graph.downloadUrl']); })
      .then(function (res) { if (!res.ok) throw new Error('No se pudo descargar el archivo.'); return res.json(); });
  }

  window.OneDrive = {
    setConfig: setConfig, configurado: configurado, init: init, login: login, logout: logout, cuenta: cuenta,
    guardar: guardar, listar: listar, descargar: descargar, redirectUri: function () { return baseDir() + 'auth.html'; }
  };
})();
