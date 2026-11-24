/* Validation & Catalogue response → view model. Builds on AA.normalize for shared cards. */
(function (AA) {
  'use strict';

  var baseNormalize = AA.normalize;

  function text(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!s) return null;
    var u = s.toUpperCase();
    if (u === 'NA' || u === 'N/A' || u === 'NULL' || u === 'UNDEFINED') return null;
    return s;
  }

  function idOrNull(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pct(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function verdictOf(flag, ran) {
    var f = String(flag || '').trim().toUpperCase();
    if (f === 'Y') return 'match';
    if (f === 'N') return 'mismatch';
    return ran ? 'mismatch' : 'skipped';
  }

  /** Backend reasoning is prefixed with "Y:" / "N:" — the verdict pill already says that. */
  function cleanReason(v) {
    var s = text(v);
    if (!s) return null;
    return s.replace(/^\s*[YN]\s*[:\-–]\s*/i, '');
  }

  /**
   * TagNumber.barcodeposition may be { position: "…" } or a plain string.
   * @param {object} tn
   * @returns {string|null}
   */
  function tagPosition(tn) {
    if (!tn || typeof tn !== 'object') return null;
    var bp = tn.barcodeposition;
    if (bp == null) return null;
    if (typeof bp === 'object') return text(bp.position);
    return text(bp);
  }

  /**
   * @param {object} raw
   * @param {object} inputs
   */
  AA.normalize = function (raw, inputs) {
    raw = raw || {};
    inputs = inputs || {};

    var shim = Object.assign({}, raw, {
      AssetName: raw.DetectedAsset != null ? raw.DetectedAsset : raw.AssetName
    });
    var vm = baseNormalize(shim, inputs);

    var ran = raw.MatchingRan && typeof raw.MatchingRan === 'object' ? raw.MatchingRan : {};
    var nameRan = ran.name_description != null ? !!ran.name_description : raw.NameDescriptionMatch != null;
    var tagRan = ran.tag != null ? !!ran.tag : raw.DetectedTagNumberMatch != null;

    var tn = raw.TagNumber && typeof raw.TagNumber === 'object' ? raw.TagNumber : {};
    // VC-only: location of the tag / barcode on the asset (not used by Additional Asset).
    if (!vm.tag) vm.tag = {};
    vm.tag.position = tagPosition(tn);

    vm.user = {
      assetName: text(raw.UserAssetName) || text(inputs.assetName),
      description: text(raw.UserDescription) || text(inputs.description),
      tagNumber: text(raw.UserTagNumber) || text(inputs.tagNumber)
    };

    vm.ids = {
      customerId: vm.customerId,
      categoryId: idOrNull(raw.CategoryId),
      assetClassId: idOrNull(raw.AssetClassId)
    };

    vm.validation = {
      name: {
        verdict: nameRan ? verdictOf(raw.NameDescriptionMatch, true) : 'skipped',
        percent: nameRan ? pct(raw.NameDescriptionMatchPercent) : null,
        reasoning: nameRan ? cleanReason(raw.NameDescriptionReasoning) : null
      },
      tag: {
        verdict: tagRan ? verdictOf(raw.DetectedTagNumberMatch, true) : 'skipped',
        percent: tagRan ? pct(raw.DetectedTagNumberMatchPercent) : null
      }
    };

    var ac = raw.AssetCondition && typeof raw.AssetCondition === 'object' ? raw.AssetCondition : null;
    vm.copyPayload = {
      UserAssetName: raw.UserAssetName != null ? raw.UserAssetName : null,
      UserDescription: raw.UserDescription != null ? raw.UserDescription : null,
      UserTagNumber: raw.UserTagNumber != null ? raw.UserTagNumber : null,
      CustomerId: raw.CustomerId != null ? raw.CustomerId : null,
      CategoryId: raw.CategoryId != null ? raw.CategoryId : null,
      AssetClassId: raw.AssetClassId != null ? raw.AssetClassId : null,
      DetectedAsset: raw.DetectedAsset != null ? raw.DetectedAsset : null,
      Description: raw.Description != null ? raw.Description : null,
      AssetCondition: ac,
      TagNumber: {
        decodedtagnumber: tn.decodedtagnumber != null ? tn.decodedtagnumber : null,
        detectedtagnumber: tn.detectedtagnumber != null ? tn.detectedtagnumber : null,
        tagnumbersource: tn.tagnumbersource != null ? tn.tagnumbersource : null,
        barcodereadability: tn.barcodereadability != null ? tn.barcodereadability : null,
        barcodeposition: tn.barcodeposition != null ? tn.barcodeposition : null
      },
      NameDescriptionMatch: raw.NameDescriptionMatch != null ? raw.NameDescriptionMatch : null,
      NameDescriptionMatchPercent: raw.NameDescriptionMatchPercent != null ? raw.NameDescriptionMatchPercent : null,
      NameDescriptionReasoning: raw.NameDescriptionReasoning != null ? raw.NameDescriptionReasoning : null,
      DetectedTagNumberMatch: raw.DetectedTagNumberMatch != null ? raw.DetectedTagNumberMatch : null,
      DetectedTagNumberMatchPercent: raw.DetectedTagNumberMatchPercent != null ? raw.DetectedTagNumberMatchPercent : null,
      AssetClassName: raw.AssetClassName != null ? raw.AssetClassName : null,
      CategoryName: raw.CategoryName != null ? raw.CategoryName : null,
      SubCategoryId: raw.SubCategoryId != null ? raw.SubCategoryId : null,
      SubCategoryName: raw.SubCategoryName != null ? raw.SubCategoryName : null,
      MakeModelId: raw.MakeModelId != null ? raw.MakeModelId : null,
      MakeModel: raw.MakeModel != null ? raw.MakeModel : null
    };

    return vm;
  };

  /** Console assertions when ?selftest=1 on validation.html */
  AA.selftest = function () {
    var passed = 0;
    var failed = 0;
    function assert(cond, msg) {
      if (cond) { passed++; console.log('✓', msg); }
      else { failed++; console.error('✗', msg); }
    }

    var sample = AA.normalize(AA.mocks.SAMPLE, { customerId: '1063' });
    assert(sample.asset.name === 'Apple MacBook', 'DetectedAsset → asset name');
    assert(sample.validation.name.verdict === 'mismatch', 'name mismatch');
    assert(sample.validation.name.percent === 20, 'name percent');
    assert(sample.validation.name.reasoning.indexOf('N:') !== 0, 'reasoning prefix stripped');
    assert(sample.validation.tag.verdict === 'mismatch' && sample.validation.tag.percent === 0, 'tag mismatch 0%');
    assert(sample.user.tagNumber === '10000058', 'user tag echo');
    assert(!!sample.tag.position, 'tag location from barcodeposition');
    assert(sample.copyPayload.TagNumber.barcodeposition != null, 'copyPayload keeps barcodeposition');
    assert(sample.matchStatus === 'full', 'catalogue full match');
    assert(sample.condition.score100 === 100, 'condition score');

    var match = AA.normalize(AA.mocks.resolve('match', {}).body, {});
    assert(match.validation.name.verdict === 'match' && match.validation.tag.verdict === 'match', 'match scenario');

    var skipped = AA.normalize(AA.mocks.resolve('skipped', {}).body, {});
    assert(skipped.validation.name.verdict === 'skipped', 'name skipped');
    assert(skipped.validation.tag.verdict === 'skipped', 'tag skipped');
    assert(skipped.validation.name.percent === null, 'skipped percent null');

    var live = AA.normalize(AA.mocks.resolve('1', { tagNumber: '1000013696', assetName: 'Office laptop' }).body, {});
    assert(live.validation.tag.verdict === 'match', 'live tag exact → match');
    assert(live.validation.name.verdict === 'match', 'live generic laptop → match');

    var brand = AA.normalize(AA.mocks.resolve('1', { assetName: 'HP Victus Laptop' }).body, {});
    assert(brand.validation.name.verdict === 'mismatch', 'live conflicting brand → mismatch');
    assert(brand.validation.tag.verdict === 'skipped', 'live no tag → skipped');

    var none = AA.normalize(AA.mocks.resolve('none', {}).body, {});
    assert(none.matchStatus === 'none', 'catalogue none');

    console.log('vc selftest done:', passed, 'passed,', failed, 'failed');
    return failed === 0;
  };
})(window.AA = window.AA || {});
