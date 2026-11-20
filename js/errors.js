(function (AA) {
  'use strict';

  function softenDetail(detail) {
    var d = String(detail || '');
    if (/missing required field:\s*assetimage/i.test(d) || /barcodeimage/i.test(d) && /missing/i.test(d)) {
      return 'Both photos are required.';
    }
    if (/customerid/i.test(d)) return 'Enter a valid Customer ID (a positive whole number).';
    if (/^missing/i.test(d)) return d.replace(/^Missing required field:\s*/i, 'Missing: ');
    return d || 'Please check your inputs and try again.';
  }

  AA.errors = {
    /**
     * @param {number} status
     * @param {object|null} body
     */
    fromResponse: function (status, body) {
      body = body || {};
      var code = String(body.error || '');
      var detail = body.detail || code;
      var requestId = body.request_id || null;

      if (status === 400 && /IMAGE_/i.test(code)) {
        return {
          kind: 'image',
          title: "We couldn't read a photo",
          message: 'One of the photos couldn\'t be opened.',
          hint: 'Use a standard JPG, PNG or WebP image under 10 MB.',
          requestId: requestId,
          canRetry: true,
          showSettings: false
        };
      }

      if (status === 400) {
        return {
          kind: 'validation',
          title: "Something's missing",
          message: softenDetail(detail),
          hint: '',
          requestId: requestId,
          canRetry: true,
          showSettings: false
        };
      }

      if (status === 502 || /PHASE1_/i.test(code)) {
        return {
          kind: 'analysis',
          title: 'Analysis failed',
          message: "Our AI service couldn't complete this one.",
          hint: 'Please try again in a moment.',
          requestId: requestId,
          canRetry: true,
          showSettings: false
        };
      }

      return {
        kind: 'server',
        title: 'Something went wrong',
        message: 'An unexpected error occurred.',
        hint: 'Try again. If it keeps happening, share the reference below with support.',
        requestId: requestId,
        canRetry: true,
        showSettings: false
      };
    },

    /** @param {'network'|'timeout'|'aborted'} kind */
    fromFailure: function (kind) {
      if (kind === 'network') {
        return {
          kind: 'network',
          title: "Can't reach the service",
          message: "We couldn't connect to the analysis service.",
          hint: 'Check the API address in settings and that the service is running. If you opened this file directly, the service must allow CORS (see README).',
          requestId: null,
          canRetry: true,
          showSettings: true
        };
      }
      if (kind === 'timeout') {
        return {
          kind: 'timeout',
          title: 'That took too long',
          message: "The analysis didn't finish in time.",
          hint: 'Try again — a smaller or clearer photo can help.',
          requestId: null,
          canRetry: true,
          showSettings: false
        };
      }
      return {
        kind: 'aborted',
        title: 'Cancelled',
        message: 'Analysis cancelled.',
        hint: '',
        requestId: null,
        canRetry: false,
        showSettings: false
      };
    }
  };
})(window.AA = window.AA || {});
