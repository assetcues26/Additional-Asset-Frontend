(function (AA) {
  'use strict';

  var SAMPLE = {
    ImageAnalysis: 'The asset is an ASUS Vivobook S laptop…',
    AssetName: 'ASUS Vivobook S laptop',
    Description: 'An ASUS Vivobook S laptop with an asset tag affixed to the palm rest.',
    AssetClassName: 'CP',
    MakeModel: 'VivoBook S14',
    CategoryName: 'CP',
    SubCategoryName: 'LAPTOP',
    MakeModelId: 7240,
    CategoryId: 1015,
    CustomerId: 1063,
    AssetClassId: 1002,
    SubCategoryId: 1323,
    AssetCondition: {
      grade: 'Good',
      condition_score: 9,
      condition_summary: 'Good condition, showing only minor signs of normal use with no significant damage or functional defects.',
      overall_score: 90,
      damage_items: [],
      damage_count: 0,
      has_damage: false
    },
    TagNumber: {
      decodedtagnumber: '10001882',
      detectedtagnumber: '10001882',
      tagnumbersource: 'decoded'
    },
    request_id: '35b53632-mock-0001-aaaa-bbbbccccdddd',
    llm_provider: 'gemini',
    timings_ms: { total: 9000 },
    llm_usage: null,
    error: null
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function withInputs(body, inputs) {
    var out = clone(body);
    if (inputs && inputs.customerId) out.CustomerId = Number(inputs.customerId);
    if (inputs && inputs.assetClassId) out.AssetClassId = Number(inputs.assetClassId);
    if (inputs && inputs.categoryId) out.CategoryId = Number(inputs.categoryId);
    return out;
  }

  AA.mocks = {
    SAMPLE: SAMPLE,

    /** @param {string} kind @param {object} inputs */
    resolve: function (kind, inputs) {
      var body;
      switch (kind) {
        case '1':
        case 'full':
          body = withInputs(SAMPLE, inputs);
          return { status: 200, body: body, latency: 9000 };

        case 'partial':
          body = withInputs(SAMPLE, inputs);
          body.MakeModel = null;
          body.MakeModelId = null;
          return { status: 200, body: body, latency: 9000 };

        case 'none':
          body = withInputs(SAMPLE, inputs);
          body.AssetClassName = null;
          body.CategoryName = null;
          body.SubCategoryName = null;
          body.MakeModel = null;
          body.MakeModelId = null;
          body.SubCategoryId = null;
          if (!(inputs && inputs.assetClassId)) body.AssetClassId = null;
          if (!(inputs && inputs.categoryId)) body.CategoryId = null;
          return { status: 200, body: body, latency: 9000 };

        case 'bad':
          body = withInputs(SAMPLE, inputs);
          body.AssetCondition = {
            grade: 'Poor',
            condition_score: 3,
            condition_summary: 'Visible damage affecting appearance and possibly usability.',
            overall_score: 30,
            damage_items: [
              {
                location: 'Screen',
                type: 'Crack',
                severity: 'severe',
                detail: 'Visible crack across the lower-left corner.'
              },
              { location: 'Chassis', type: 'Dent', severity: 'moderate' }
            ],
            damage_count: 2,
            has_damage: true
          };
          return { status: 200, body: body, latency: 9000 };

        case 'vision':
          body = withInputs(SAMPLE, inputs);
          body.TagNumber = {
            decodedtagnumber: null,
            detectedtagnumber: '10001882',
            tagnumbersource: 'vision'
          };
          return { status: 200, body: body, latency: 9000 };

        case 'mismatch':
          body = withInputs(SAMPLE, inputs);
          body.TagNumber = {
            decodedtagnumber: '10001882',
            detectedtagnumber: '10001862',
            tagnumbersource: 'decoded'
          };
          return { status: 200, body: body, latency: 9000 };

        case 'notag':
          body = withInputs(SAMPLE, inputs);
          body.TagNumber = {
            decodedtagnumber: null,
            detectedtagnumber: null,
            tagnumbersource: 'NA'
          };
          return { status: 200, body: body, latency: 9000 };

        case 'error502':
          return {
            status: 502,
            body: {
              error: 'PHASE1_FAILED: upstream model error',
              detail: 'PHASE1_FAILED: upstream model error',
              request_id: 'mock-502'
            },
            latency: 2500
          };

        case 'error400img':
          return {
            status: 400,
            body: {
              error: 'IMAGE_PREPROCESS_FAILED: cannot identify image file',
              detail: 'IMAGE_PREPROCESS_FAILED: cannot identify image file',
              request_id: 'mock-400img'
            },
            latency: 800
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
