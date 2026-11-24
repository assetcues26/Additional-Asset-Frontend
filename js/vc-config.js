/* Validation & Catalogue page — overrides the shared config before any other module reads it. */
(function (AA) {
  'use strict';

  var mod = AA.config.MODULES.vc;

  AA.config.APP_NAME = mod.name;
  AA.config.SUBMIT_LABEL = 'Validate asset';
  AA.config.DEFAULT_API_BASE = mod.defaultApiBase;
  AA.config.STORAGE.apiBase = mod.storageKey;
  AA.config.ENDPOINTS = {
    analyze: '/api/validation_catalogue',
    health: '/api/health'
  };
  // Backend runs generation + matching + catalogue (~40 s typical).
  AA.config.REQUEST_TIMEOUT_MS = 180000;
  AA.config.LONG_WAIT_MS = 75000;
  AA.config.TEXT_LIMITS = { assetName: 500, description: 2000, tagNumber: 128 };

  // Stage ids 'tag' and 'analyze' drive the scanner pip / lock-on effects.
  AA.config.STAGES = [
    { id: 'upload',   label: 'Uploading photos',                       real: true },
    { id: 'prepare',  label: 'Preparing images',                       est: 600 },
    { id: 'identify', label: 'Working out which photo is which',       est: 2500 },
    { id: 'tag',      label: 'Reading the tag & barcode',              est: 1500 },
    { id: 'analyze',  label: 'Analyzing the asset & its condition',    est: 22000 },
    { id: 'validate', label: 'Validating your name, description & tag', est: 2500 },
    { id: 'search',   label: 'Searching the catalogue',                est: 2500 },
    { id: 'match',    label: 'Recommending category & make/model',     est: 1500 }
  ];

  AA.config.ROTATOR = [
    'Looking closely at your photos…',
    'Comparing with the record you entered…',
    'Checking the tag number…',
    'Finding the best catalogue match…'
  ];

  AA.state.apiBase = AA.config.DEFAULT_API_BASE;
  AA.state.inputs.assetName = '';
  AA.state.inputs.description = '';
  AA.state.inputs.tagNumber = '';
})(window.AA = window.AA || {});
