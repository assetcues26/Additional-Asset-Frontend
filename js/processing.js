(function (AA) {
  'use strict';

  var stages = AA.config.STAGES;
  var stageTimers = [];
  var elapsedTimer = null;
  var rotatorTimer = null;
  var longWaitTimer = null;
  var activeHandle = null;
  var uploadDone = false;
  var completedCount = 0;
  var currentFraction = 0;
  var progressRaf = null;
  var finishing = false;

  function optText(v) {
    var s = v == null ? '' : String(v).trim();
    return s || undefined;
  }

  function weightOf(i) {
    return i === 0 ? 0.08 : (0.92 / (stages.length - 1));
  }

  function totalWeight() {
    var t = 0;
    for (var i = 0; i < stages.length; i++) t += weightOf(i);
    return t;
  }

  function computeProgress() {
    var doneW = 0;
    for (var i = 0; i < completedCount; i++) doneW += weightOf(i);
    var curW = completedCount < stages.length ? weightOf(completedCount) * currentFraction : 0;
    var raw = (doneW + curW) / totalWeight();
    var eased = AA.easeOut(Math.min(raw, 1));
    return Math.min(0.94, eased) * 100;
  }

  function setProgress(pct, force) {
    var fill = AA.$('#progress-fill');
    var bar = AA.$('#progress-bar');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    if (bar) {
      bar.setAttribute('aria-valuenow', String(Math.round(pct)));
      bar.setAttribute('aria-valuetext', 'Estimated progress ' + Math.round(pct) + ' percent');
    }
  }

  function setStage(index, state, sub) {
    var item = AA.$('#stage-' + index);
    if (!item) return;
    item.dataset.state = state;
    if (state === 'active') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    var subEl = AA.$('.timeline__sub', item);
    if (subEl) subEl.textContent = sub || '';
    var node = AA.$('.timeline__node', item);
    if (node && state === 'done') {
      while (node.firstChild) node.removeChild(node.firstChild);
      node.appendChild(AA.icon('check', { size: 12 }));
    }
    updateConnector();
  }

  function updateConnector() {
    var fill = AA.$('#timeline-fill');
    var list = AA.$('#timeline');
    if (!fill || !list) return;
    var items = AA.$$('.timeline__item', list);
    if (!items.length) return;
    var done = items.filter(function (it) { return it.dataset.state === 'done'; }).length;
    var active = items.find(function (it) { return it.dataset.state === 'active'; });
    var frac = done / items.length;
    if (active) frac = (done + 0.5) / items.length;
    var h = Math.max(0, (list.offsetHeight - 24) * frac);
    fill.style.height = h + 'px';
  }

  function announceStage(index) {
    var s = stages[index];
    if (!s) return;
    AA.announce('Step ' + (index + 1) + ' of ' + stages.length + ': ' + s.label);
  }

  function runStage(index) {
    if (finishing) return;
    setStage(index, 'active');
    AA.state.request.stageIndex = index;
    announceStage(index);

    var scanner = AA.$('#scanner');
    if (scanner && stages[index].id === 'analyze') scanner.classList.add('is-locked');
    var pip = AA.$('#scanner-pip');
    if (pip) pip.classList.toggle('is-reading', stages[index].id === 'tag');

    // Last stage stays active until the response arrives
    if (index >= stages.length - 1) {
      currentFraction = 0.45;
      setProgress(computeProgress());
      return;
    }

    var est = stages[index].est || 2000;
    var start = performance.now();
    if (progressRaf) cancelAnimationFrame(progressRaf);
    var tick = function (now) {
      if (finishing) return;
      currentFraction = Math.min(0.95, (now - start) / est);
      setProgress(computeProgress());
      if (currentFraction < 0.95) progressRaf = requestAnimationFrame(tick);
    };
    progressRaf = requestAnimationFrame(tick);

    var t = window.setTimeout(function () {
      if (finishing) return;
      setStage(index, 'done');
      completedCount = index + 1;
      currentFraction = 0;
      setProgress(computeProgress());
      runStage(index + 1);
    }, est);
    stageTimers.push(t);
  }

  function startRotator() {
    var el = AA.$('#proc-rotator');
    if (!el) return;
    var msgs = AA.config.ROTATOR.slice();
    var i = 0;
    el.textContent = msgs[0];
    rotatorTimer = window.setInterval(function () {
      if (AA.prefersReducedMotion()) {
        i = (i + 1) % msgs.length;
        el.textContent = msgs[i];
        return;
      }
      el.classList.add('is-swap');
      window.setTimeout(function () {
        i = (i + 1) % msgs.length;
        el.textContent = msgs[i];
        el.classList.remove('is-swap');
      }, 220);
    }, 4000);

    longWaitTimer = window.setTimeout(function () {
      if (rotatorTimer) window.clearInterval(rotatorTimer);
      rotatorTimer = null;
      el.textContent = AA.config.LONG_WAIT;
    }, AA.config.LONG_WAIT_MS || 45000);
  }

  function startElapsed() {
    var el = AA.$('#proc-timer');
    var start = AA.state.request.startedAt;
    elapsedTimer = window.setInterval(function () {
      if (el) el.textContent = AA.format.mmss(Date.now() - start);
    }, 250);
  }

  function clearTimers() {
    stageTimers.forEach(function (t) { window.clearTimeout(t); });
    stageTimers = [];
    if (elapsedTimer) window.clearInterval(elapsedTimer);
    if (rotatorTimer) window.clearInterval(rotatorTimer);
    if (longWaitTimer) window.clearTimeout(longWaitTimer);
    if (progressRaf) cancelAnimationFrame(progressRaf);
    elapsedTimer = rotatorTimer = longWaitTimer = progressRaf = null;
  }

  function resetUI() {
    completedCount = 0;
    currentFraction = 0;
    uploadDone = false;
    finishing = false;
    for (var i = 0; i < stages.length; i++) {
      setStage(i, 'pending');
      var node = AA.$('#stage-' + i + ' .timeline__node');
      if (node) while (node.firstChild) node.removeChild(node.firstChild);
    }
    setProgress(0);
    var scanner = AA.$('#scanner');
    if (scanner) scanner.classList.remove('is-locked', 'is-complete', 'is-flash');
    var pip = AA.$('#scanner-pip');
    if (pip) pip.classList.remove('is-reading');
    var timer = AA.$('#proc-timer');
    if (timer) timer.textContent = '00:00';
  }

  function applyPhotos() {
    var main = AA.$('#scanner-img');
    var pipImg = AA.$('#scanner-pip-img');
    if (main && AA.state.previews.asset) main.src = AA.state.previews.asset;
    if (pipImg && AA.state.previews.tag) pipImg.src = AA.state.previews.tag;
  }

  function fastForward(done) {
    finishing = true;
    clearTimers();
    var i = completedCount;
    function step() {
      if (i < stages.length) {
        setStage(i, 'done');
        completedCount = i + 1;
        i++;
        setProgress(Math.min(99, 70 + completedCount * 4));
        window.setTimeout(step, AA.prefersReducedMotion() ? 0 : 140);
      } else {
        setProgress(100);
        var scanner = AA.$('#scanner');
        if (scanner) {
          scanner.classList.add('is-locked', 'is-complete', 'is-flash');
        }
        window.setTimeout(done, AA.prefersReducedMotion() ? 0 : 350);
      }
    }
    step();
  }

  function onSuccess(body) {
    AA.state.rawResult = body;
    AA.state.result = AA.normalize(body, AA.state.inputs);
    fastForward(function () {
      AA.setView('result');
      if (AA.resultView) AA.resultView.render();
    });
  }

  function onFail(err) {
    clearTimers();
    if (err && err.kind === 'aborted') {
      AA.setView('idle');
      AA.toast('Analysis cancelled. Your photos are still here.', { type: 'info' });
      return;
    }
    var mapped = err && err.kind && !err.status
      ? AA.errors.fromFailure(err.kind)
      : AA.errors.fromResponse(err.status || 500, err.body || err);
    AA.state.error = mapped;
    AA.setView('error');
    if (AA.errorView) AA.errorView.render();
  }

  AA.processing = {
    start: function () {
      resetUI();
      applyPhotos();
      AA.state.request.startedAt = Date.now();
      AA.state.request.uploadPct = 0;
      AA.state.request.stageIndex = 0;
      AA.setView('processing');

      // FLIP from dropzone
      var from = AA.upload.getPreviewRect('asset');
      var dest = AA.$('#scanner-img');
      if (from && dest) {
        window.setTimeout(function () { AA.fx.flip(dest, from); }, 40);
      }

      setStage(0, 'active', '0%');
      announceStage(0);
      startElapsed();
      startRotator();

      activeHandle = AA.api.analyze({
        assetFile: AA.state.files.asset,
        tagFile: AA.state.files.tag,
        customerId: AA.state.inputs.customerId,
        assetClassId: AA.state.inputs.assetClassId || undefined,
        categoryId: AA.state.inputs.categoryId || undefined,
        assetName: optText(AA.state.inputs.assetName),
        description: optText(AA.state.inputs.description),
        tagNumber: optText(AA.state.inputs.tagNumber)
      }, {
        onUploadProgress: function (pct) {
          AA.state.request.uploadPct = pct;
          currentFraction = pct / 100;
          setStage(0, 'active', pct + '%');
          var sub = AA.$('#stage-0 .timeline__sub');
          if (sub) sub.textContent = pct + '%';
          // label with percent
          var lab = AA.$('#stage-0 .timeline__label');
          if (lab) lab.textContent = 'Uploading photos · ' + pct + '%';
          setProgress(computeProgress());
        },
        onUploadDone: function () {
          uploadDone = true;
          var lab = AA.$('#stage-0 .timeline__label');
          if (lab) lab.textContent = stages[0].label;
          setStage(0, 'done');
          completedCount = 1;
          currentFraction = 0;
          setProgress(computeProgress());
          runStage(1);
        }
      });

      activeHandle.then(function (res) {
        activeHandle = null;
        if (res.status >= 200 && res.status < 300) {
          onSuccess(res.body);
        } else {
          onFail({ status: res.status, body: res.body });
        }
      }).catch(function (err) {
        activeHandle = null;
        onFail(err);
      });
    },

    cancel: function (silent) {
      if (activeHandle && activeHandle.abort) activeHandle.abort();
      clearTimers();
      finishing = true;
      if (!silent) {
        // abort handler will toast
      }
    },

    retry: function () {
      AA.processing.start();
    }
  };

  // Cancel button
  document.addEventListener('DOMContentLoaded', function () {
    var btn = AA.$('#btn-cancel');
    if (btn) {
      btn.addEventListener('click', function () {
        AA.processing.cancel();
      });
    }
  });
})(window.AA = window.AA || {});
