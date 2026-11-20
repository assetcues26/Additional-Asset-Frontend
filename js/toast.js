(function (AA) {
  'use strict';

  var MAX = 3;

  /**
   * @param {string} message
   * @param {{type?:'info'|'success'|'error', ms?:number}} [opts]
   */
  AA.toast = function (message, opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var ms = opts.ms != null ? opts.ms : 2600;
    var root = AA.$('#toasts');
    if (!root) return;

    while (root.children.length >= MAX) {
      root.removeChild(root.firstChild);
    }

    var iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
    var el = AA.el('div', {
      className: 'toast toast--' + type,
      role: 'status'
    }, AA.icon(iconName), AA.el('span', { text: message }));

    root.appendChild(el);
    window.setTimeout(function () {
      el.classList.add('is-out');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }, ms);
  };
})(window.AA = window.AA || {});
