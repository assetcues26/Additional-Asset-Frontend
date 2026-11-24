/* Offline responses for POST /api/validation_catalogue (validation.html?mock=…). */
(function (AA) {
  'use strict';

  var DETECTED_TAG = '1000013696';

  var SAMPLE = {
    UserAssetName: 'HP Victus Laptop',
    UserDescription: 'Black HP Victus Laptop on white desk',
    UserTagNumber: '10000058',
    CustomerId: 1063,
    CategoryId: 1015,
    AssetClassId: 1002,
    ImageAnalysis: 'The primary asset is an Apple MacBook laptop, identifiable by the iconic Apple logo on the lid. The device is in a clean, modern office setting with a white desk surface. No other assets are visible in the frame. The laptop appears to be in excellent condition with no visible damage or wear.',
    DetectedAsset: 'Apple MacBook',
    Description: 'A sleek Apple MacBook laptop with a metallic finish and the Apple logo on the lid.',
    AssetCondition: {
      grade: 'Excellent',
      condition_score: 10,
      condition_summary: 'Excellent condition, no visible damage or wear.',
      overall_score: 100,
      damage_items: [],
      damage_count: 0,
      has_damage: false
    },
    TagNumber: {
      decodedtagnumber: DETECTED_TAG,
      detectedtagnumber: DETECTED_TAG,
      tagnumbersource: 'vision',
      barcodereadability: 'Y',
      barcodeposition: {
        position: 'The barcode sticker is held by a finger in the close-up image, not visible on the laptop in the primary photo.'
      }
    },
    NameDescriptionMatch: 'N',
    NameDescriptionMatchPercent: 20,
    NameDescriptionReasoning: 'N: The name specifies an HP Victus laptop, but the image analysis confirms the tagged device is an Apple MacBook, creating a brand conflict.',
    DetectedTagNumberMatch: 'N',
    DetectedTagNumberMatchPercent: 0,
    MatchingRan: { name_description: true, tag: true },
    AssetClassName: 'CP',
    CategoryName: 'CP',
    SubCategoryId: 1019,
    SubCategoryName: 'MACBOOK',
    MakeModelId: 6411,
    MakeModel: 'Apple Macbook',
    PineconeMode: 'aa_vision',
    request_id: 'efc4b736-mock-0001-vc00-bbbbccccdddd',
    llm_provider: 'gemini',
    timings_ms: { total: 10000 },
    llm_usage: null,
    error: null
  };

  var DEFAULT_USER = {
    assetName: 'Apple MacBook Pro',
    description: 'Silver Apple MacBook laptop on a white desk',
    tagNumber: DETECTED_TAG
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function text(v) {
    var s = v == null ? '' : String(v).trim();
    return s || null;
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    var prev = [];
    var cur = [];
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  /** Base body with request echoes (customer / ids / user fields) applied. */
  function base(inputs, user) {
    var out = clone(SAMPLE);
    inputs = inputs || {};
    out.CustomerId = inputs.customerId ? Number(inputs.customerId) : SAMPLE.CustomerId;
    if (inputs.categoryId) out.CategoryId = Number(inputs.categoryId);
    if (inputs.assetClassId) out.AssetClassId = Number(inputs.assetClassId);
    out.UserAssetName = user.assetName;
    out.UserDescription = user.description;
    out.UserTagNumber = user.tagNumber;
    return out;
  }

  function nameVerdict(user) {
    var name = user.assetName;
    var desc = user.description;
    if (!name && !desc) {
      return { match: null, pct: null, reason: null, ran: false };
    }
    var said = (name || '') + ' ' + (desc || '');
    var subject = name ? 'The name' : 'The description';
    if (/apple|macbook|mac\s*book/i.test(said)) {
      return {
        match: 'Y', pct: 92, ran: true,
        reason: 'Y: ' + subject + ' identifies an Apple MacBook, which matches the device seen in the photo.'
      };
    }
    var brand = said.match(/\b(hp|dell|lenovo|asus|acer|samsung|microsoft|surface|toshiba|msi|sony|huawei|xiaomi)\b/i);
    if (brand) {
      return {
        match: 'N', pct: 20, ran: true,
        reason: 'N: ' + subject + ' specifies ' + brand[1] + ', but the image analysis confirms the tagged device is an Apple MacBook, creating a brand conflict.'
      };
    }
    if (/laptop|notebook|computer/i.test(said)) {
      return {
        match: 'Y', pct: 74, ran: true,
        reason: 'Y: ' + subject + ' describes a laptop without a conflicting brand; consistent with the Apple MacBook in the photo.'
      };
    }
    return {
      match: 'N', pct: 18, ran: true,
      reason: 'N: ' + subject + ' refers to "' + (name || desc) + '", but the image analysis confirms the tagged device is an Apple MacBook.'
    };
  }

  function tagVerdict(user) {
    if (!user.tagNumber) return { match: null, pct: null, ran: false };
    var a = user.tagNumber.replace(/\s+/g, '').toUpperCase();
    if (a === DETECTED_TAG) return { match: 'Y', pct: 100, ran: true };
    var sim = 1 - levenshtein(a, DETECTED_TAG) / Math.max(a.length, DETECTED_TAG.length);
    return { match: 'N', pct: Math.max(0, Math.min(95, Math.round(sim * 100))), ran: true };
  }

  function applyVerdicts(body, nv, tv) {
    body.NameDescriptionMatch = nv.match;
    body.NameDescriptionMatchPercent = nv.pct;
    body.NameDescriptionReasoning = nv.reason;
    body.DetectedTagNumberMatch = tv.match;
    body.DetectedTagNumberMatchPercent = tv.pct;
    body.MatchingRan = { name_description: nv.ran, tag: tv.ran };
    body.PineconeMode = nv.match === 'Y' ? 'identity' : 'aa_vision';
    return body;
  }

  function userFrom(inputs) {
    inputs = inputs || {};
    return {
      assetName: text(inputs.assetName),
      description: text(inputs.description),
      tagNumber: text(inputs.tagNumber)
    };
  }

  /** Inputs if the user typed any, otherwise representative demo values. */
  function userOrDefault(inputs, fallback) {
    var u = userFrom(inputs);
    if (u.assetName || u.description || u.tagNumber) return u;
    return clone(fallback);
  }

  function ok(body) {
    return { status: 200, body: body, latency: 10000 };
  }

  AA.mocks = {
    SAMPLE: SAMPLE,

    /** @param {string} kind @param {object} inputs */
    resolve: function (kind, inputs) {
      var user;
      var body;
      switch (kind) {
        case '1':
        case 'full':
        case 'live':
          // Reacts to what was typed: Apple/MacBook or a generic "laptop" → match, another brand → mismatch, blank → skipped.
          user = userFrom(inputs);
          body = base(inputs, user);
          return ok(applyVerdicts(body, nameVerdict(user), tagVerdict(user)));

        case 'match':
          user = userOrDefault(inputs, DEFAULT_USER);
          body = base(inputs, user);
          return ok(applyVerdicts(body,
            { match: 'Y', pct: 94, ran: true, reason: 'Y: The registered record describes an Apple MacBook laptop, matching the device in the photo.' },
            { match: 'Y', pct: 100, ran: true }));

        case 'mismatch':
          user = userOrDefault(inputs, {
            assetName: SAMPLE.UserAssetName,
            description: SAMPLE.UserDescription,
            tagNumber: SAMPLE.UserTagNumber
          });
          body = base(inputs, user);
          return ok(applyVerdicts(body,
            { match: 'N', pct: 20, ran: true, reason: SAMPLE.NameDescriptionReasoning },
            { match: 'N', pct: 0, ran: true }));

        case 'skipped':
          user = { assetName: null, description: null, tagNumber: null };
          body = base(inputs, user);
          return ok(applyVerdicts(body,
            { match: null, pct: null, reason: null, ran: false },
            { match: null, pct: null, ran: false }));

        case 'partial':
          user = userFrom(inputs);
          body = applyVerdicts(base(inputs, user), nameVerdict(user), tagVerdict(user));
          body.MakeModel = null;
          body.MakeModelId = null;
          return ok(body);

        case 'none':
          user = userFrom(inputs);
          body = applyVerdicts(base(inputs, user), nameVerdict(user), tagVerdict(user));
          body.AssetClassName = null;
          body.CategoryName = null;
          body.SubCategoryId = null;
          body.SubCategoryName = null;
          body.MakeModelId = null;
          body.MakeModel = null;
          if (!(inputs && inputs.categoryId)) body.CategoryId = null;
          if (!(inputs && inputs.assetClassId)) body.AssetClassId = null;
          return ok(body);

        case 'bad':
          user = userFrom(inputs);
          body = applyVerdicts(base(inputs, user), nameVerdict(user), tagVerdict(user));
          body.AssetCondition = {
            grade: 'Poor',
            condition_score: 3,
            condition_summary: 'Visible damage affecting appearance and possibly usability.',
            overall_score: 30,
            damage_items: [
              { location: 'Screen', type: 'Crack', severity: 'severe', detail: 'Visible crack across the lower-left corner.' },
              { location: 'Lid', type: 'Dent', severity: 'moderate' }
            ],
            damage_count: 2,
            has_damage: true
          };
          return ok(body);

        case 'vision':
          user = userFrom(inputs);
          body = applyVerdicts(base(inputs, user), nameVerdict(user), tagVerdict(user));
          body.TagNumber.decodedtagnumber = null;
          return ok(body);

        case 'notag':
          user = userFrom(inputs);
          body = applyVerdicts(base(inputs, user), nameVerdict(user),
            user.tagNumber ? { match: 'N', pct: 0, ran: true } : { match: null, pct: null, ran: false });
          body.TagNumber = {
            decodedtagnumber: null,
            detectedtagnumber: null,
            tagnumbersource: 'NA',
            barcodereadability: 'N',
            barcodeposition: { position: 'NA' }
          };
          return ok(body);

        case 'error502':
          return {
            status: 502,
            body: { error: 'PHASE1_FAILED', detail: 'PHASE1_FAILED: upstream model error', request_id: 'mock-vc-502' },
            latency: 2500
          };

        case 'error400img':
          return {
            status: 400,
            body: { error: 'IMAGE_PREPROCESS_FAILED', detail: 'IMAGE_PREPROCESS_FAILED: cannot identify image file', request_id: 'mock-vc-400img' },
            latency: 800
          };

        case 'error400':
          return {
            status: 400,
            body: { error: 'PAYLOAD_VALIDATION_FAILED', detail: 'customerid must be a positive integer', request_id: 'mock-vc-400' },
            latency: 600
          };

        case 'network':
          return { kind: 'network', latency: 600 };

        case 'timeout':
          return { kind: 'timeout', latency: 1500 };

        default:
          return null;
      }
    }
  };
})(window.AA = window.AA || {});
