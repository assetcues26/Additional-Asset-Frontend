(function (AA) {
  'use strict';

  function emptyName(v) {
    if (v == null) return true;
    var s = String(v).trim();
    if (!s) return true;
    var u = s.toUpperCase();
    return u === 'NA' || u === 'N/A' || u === 'NULL' || u === 'UNDEFINED' || u === '—';
  }

  function cleanName(v) {
    return emptyName(v) ? null : String(v).trim();
  }

  function cleanId(v) {
    if (v == null || v === '' || emptyName(v)) return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function toneFromGrade(grade, score100) {
    var g = String(grade || '').toLowerCase();
    if (AA.config.GRADES[g]) return g;
    if (score100 >= 85) return 'excellent';
    if (score100 >= 70) return 'good';
    if (score100 >= 50) return 'fair';
    if (score100 >= 30) return 'poor';
    return 'bad';
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /**
   * @param {object} raw
   * @param {{customerId:string, assetClassId:string, categoryId:string}} inputs
   */
  AA.normalize = function (raw, inputs) {
    raw = raw || {};
    inputs = inputs || {};

    var assetClassId = cleanId(raw.AssetClassId);
    var categoryId = cleanId(raw.CategoryId);
    var subCategoryId = cleanId(raw.SubCategoryId);
    var makeModelId = cleanId(raw.MakeModelId);

    var assetClassName = cleanName(raw.AssetClassName);
    var categoryName = cleanName(raw.CategoryName);
    var subCategoryName = cleanName(raw.SubCategoryName);
    var makeModelName = cleanName(raw.MakeModel);

    var fromAssetClass = !!(inputs.assetClassId && assetClassId != null &&
      String(assetClassId) === String(inputs.assetClassId));
    var fromCategory = !!(inputs.categoryId && categoryId != null &&
      String(categoryId) === String(inputs.categoryId));

    var matchStatus = 'none';
    if (subCategoryName && makeModelName) matchStatus = 'full';
    else if (subCategoryName) matchStatus = 'partial';

    var condition = null;
    var ac = raw.AssetCondition;
    if (ac && typeof ac === 'object') {
      var score100 = ac.overall_score;
      var score10 = ac.condition_score;
      if (score100 == null && score10 != null) {
        score100 = score10 <= 10 ? score10 * 10 : score10;
      }
      if (score10 == null && score100 != null) {
        score10 = Math.round(score100 / 10);
      }
      score100 = clamp(Number(score100) || 0, 0, 100);
      score10 = clamp(Number(score10) || 0, 0, 10);
      var tone = toneFromGrade(ac.grade, score100);
      var items = Array.isArray(ac.damage_items) ? ac.damage_items : [];
      items = items.filter(function (it) { return it && typeof it === 'object'; }).map(function (it) {
        return {
          location: it.location || '',
          type: it.type || '',
          severity: it.severity || '',
          detail: it.detail || ''
        };
      });
      condition = {
        grade: cleanName(ac.grade) || tone.charAt(0).toUpperCase() + tone.slice(1),
        tone: tone,
        score10: score10,
        score100: score100,
        summary: cleanName(ac.condition_summary) || '',
        hasDamage: !!ac.has_damage,
        damageCount: Number(ac.damage_count) || items.length,
        damageItems: items
      };
    }

    var tn = raw.TagNumber || {};
    var decoded = cleanName(tn.decodedtagnumber);
    var detected = cleanName(tn.detectedtagnumber);
    var srcRaw = String(tn.tagnumbersource || '').toLowerCase();
    var source = 'none';
    if (srcRaw === 'decoded') source = 'decoded';
    else if (srcRaw === 'vision') source = 'vision';
    else if (decoded || detected) source = 'vision';

    var primary = decoded || detected || null;
    var relation = 'none';
    if (decoded && detected) {
      relation = decoded === detected ? 'match' : 'mismatch';
    } else if (decoded || detected) {
      relation = 'single';
    }

    var customerId = cleanId(raw.CustomerId) != null
      ? cleanId(raw.CustomerId)
      : (inputs.customerId ? Number(inputs.customerId) : null);

    var copyPayload = {
      AssetName: raw.AssetName != null ? raw.AssetName : null,
      Description: raw.Description != null ? raw.Description : null,
      AssetClassName: raw.AssetClassName != null ? raw.AssetClassName : null,
      MakeModel: raw.MakeModel != null ? raw.MakeModel : null,
      CategoryName: raw.CategoryName != null ? raw.CategoryName : null,
      SubCategoryName: raw.SubCategoryName != null ? raw.SubCategoryName : null,
      MakeModelId: raw.MakeModelId != null ? raw.MakeModelId : null,
      CategoryId: raw.CategoryId != null ? raw.CategoryId : null,
      CustomerId: raw.CustomerId != null ? raw.CustomerId : null,
      AssetClassId: raw.AssetClassId != null ? raw.AssetClassId : null,
      SubCategoryId: raw.SubCategoryId != null ? raw.SubCategoryId : null,
      AssetCondition: ac
        ? {
            grade: ac.grade,
            condition_score: ac.condition_score,
            condition_summary: ac.condition_summary,
            overall_score: ac.overall_score,
            damage_items: ac.damage_items || [],
            damage_count: ac.damage_count,
            has_damage: ac.has_damage
          }
        : null,
      TagNumber: {
        decodedtagnumber: tn.decodedtagnumber != null ? tn.decodedtagnumber : null,
        detectedtagnumber: tn.detectedtagnumber != null ? tn.detectedtagnumber : null,
        tagnumbersource: tn.tagnumbersource != null ? tn.tagnumbersource : null
      }
    };

    return {
      asset: {
        name: cleanName(raw.AssetName) || 'Unnamed asset',
        description: cleanName(raw.Description) || ''
      },
      customerId: customerId,
      classification: {
        assetClass: { name: assetClassName, id: assetClassId, fromInput: fromAssetClass },
        category: { name: categoryName, id: categoryId, fromInput: fromCategory },
        subCategory: { name: subCategoryName, id: subCategoryId },
        makeModel: { name: makeModelName, id: makeModelId }
      },
      matchStatus: matchStatus,
      condition: condition,
      tag: {
        decoded: decoded,
        detected: detected,
        source: source,
        primary: primary,
        relation: relation
      },
      copyPayload: copyPayload
    };
  };

  /** Self-test helper when ?selftest=1 */
  AA.selftest = function () {
    var ok = 0;
    var fail = 0;
    function assert(cond, msg) {
      if (cond) { ok++; console.log('✓', msg); }
      else { fail++; console.error('✗', msg); }
    }
    var full = AA.normalize(AA.mocks.SAMPLE, { customerId: '1063' });
    assert(full.matchStatus === 'full', 'full matchStatus');
    assert(full.tag.source === 'decoded', 'tag decoded');
    assert(full.tag.relation === 'match', 'tag match');
    assert(full.condition.score100 === 90, 'score100');

    var partial = AA.mocks.resolve('partial', { customerId: '1063' }).body;
    assert(AA.normalize(partial, { customerId: '1063' }).matchStatus === 'partial', 'partial');

    var none = AA.mocks.resolve('none', { customerId: '1063' }).body;
    assert(AA.normalize(none, { customerId: '1063' }).matchStatus === 'none', 'none');

    var vision = AA.mocks.resolve('vision', {}).body;
    assert(AA.normalize(vision, {}).tag.source === 'vision', 'vision');

    var mismatch = AA.mocks.resolve('mismatch', {}).body;
    assert(AA.normalize(mismatch, {}).tag.relation === 'mismatch', 'mismatch');

    var notag = AA.mocks.resolve('notag', {}).body;
    assert(AA.normalize(notag, {}).tag.relation === 'none', 'notag');

    console.log('selftest done:', ok, 'passed,', fail, 'failed');
    return fail === 0;
  };
})(window.AA = window.AA || {});
