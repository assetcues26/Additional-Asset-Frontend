(function (AA) {
  'use strict';

  function parseBody(text) {
    if (!text) return null;
    try { return JSON.parse(text); }
    catch (e) { return { error: 'INTERNAL_SERVER_ERROR', detail: 'Malformed JSON response' }; }
  }

  function simulateUpload(onProgress, done) {
    var pct = 0;
    var id = window.setInterval(function () {
      pct += 12 + Math.random() * 18;
      if (pct >= 100) {
        pct = 100;
        window.clearInterval(id);
        if (onProgress) onProgress(100);
        if (done) done();
      } else if (onProgress) {
        onProgress(Math.floor(pct));
      }
    }, 80);
    return function abort() { window.clearInterval(id); };
  }

  AA.api = {
    /**
     * @param {{assetFile:File, tagFile:File, customerId:string, assetClassId?:string, categoryId?:string}} payload
     * @param {{onUploadProgress?:Function, onUploadDone?:Function}} [hooks]
     * @returns {Promise<{status:number, body:object}> & {abort:Function}}
     */
    analyze: function (payload, hooks) {
      hooks = hooks || {};
      var aborted = false;
      var xhr = null;
      var abortSim = null;
      var timer = null;
      var settle = null;

      var promise = new Promise(function (resolve, reject) {
        settle = { resolve: resolve, reject: reject };

        if (AA.state.mock) {
          var mock = AA.mocks.resolve(AA.state.mock, {
            customerId: payload.customerId,
            assetClassId: payload.assetClassId,
            categoryId: payload.categoryId
          });
          if (!mock) {
            reject({ kind: 'server', message: 'Unknown mock' });
            return;
          }

          abortSim = simulateUpload(hooks.onUploadProgress, function () {
            if (aborted) return;
            if (hooks.onUploadDone) hooks.onUploadDone();
          });

          timer = window.setTimeout(function () {
            if (aborted) return;
            if (mock.kind === 'network') {
              reject({ kind: 'network' });
              return;
            }
            if (mock.kind === 'timeout') {
              reject({ kind: 'timeout' });
              return;
            }
            resolve({ status: mock.status, body: mock.body });
          }, mock.latency || 9000);

          return;
        }

        var fd = new FormData();
        fd.append('assetimage', payload.assetFile);
        fd.append('barcodeimage', payload.tagFile);
        fd.append('customerid', String(payload.customerId));
        if (payload.assetClassId) fd.append('assetclassid', String(payload.assetClassId));
        if (payload.categoryId) fd.append('categoryid', String(payload.categoryId));

        xhr = new XMLHttpRequest();
        AA.state.request.xhr = xhr;
        xhr.open('POST', AA.stripTrailingSlash(AA.state.apiBase) + AA.config.ENDPOINTS.analyze);
        xhr.timeout = AA.config.REQUEST_TIMEOUT_MS;
        xhr.responseType = 'text';

        xhr.upload.onprogress = function (ev) {
          if (!ev.lengthComputable) return;
          var pct = Math.round((ev.loaded / ev.total) * 100);
          if (hooks.onUploadProgress) hooks.onUploadProgress(pct);
        };
        xhr.upload.onload = function () {
          if (hooks.onUploadDone) hooks.onUploadDone();
        };

        xhr.onload = function () {
          var body = parseBody(xhr.responseText);
          resolve({ status: xhr.status, body: body });
        };
        xhr.onerror = function () { reject({ kind: 'network' }); };
        xhr.ontimeout = function () { reject({ kind: 'timeout' }); };
        xhr.onabort = function () { reject({ kind: 'aborted' }); };

        xhr.send(fd);
      });

      promise.abort = function () {
        if (aborted) return;
        aborted = true;
        if (abortSim) abortSim();
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
        if (xhr) {
          xhr.abort();
        } else if (settle) {
          settle.reject({ kind: 'aborted' });
        }
      };

      return promise;
    },

    /** @returns {Promise<{ok:boolean, info?:object}>} */
    health: function () {
      if (AA.state.mock) {
        return Promise.resolve({ ok: true, info: { status: 'healthy', mock: true } });
      }
      return new Promise(function (resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', AA.stripTrailingSlash(AA.state.apiBase) + AA.config.ENDPOINTS.health);
        xhr.timeout = AA.config.HEALTH_TIMEOUT_MS;
        xhr.responseType = 'text';
        xhr.onload = function () {
          var body = parseBody(xhr.responseText);
          resolve({ ok: xhr.status === 200 && body && body.status === 'healthy', info: body });
        };
        xhr.onerror = function () { resolve({ ok: false }); };
        xhr.ontimeout = function () { resolve({ ok: false }); };
        xhr.send();
      });
    }
  };
})(window.AA = window.AA || {});
