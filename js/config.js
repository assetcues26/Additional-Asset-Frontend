(function (AA) {
  'use strict';

  AA.config = {
    APP_NAME: 'Additional Asset',
    SUBMIT_LABEL: 'Analyze asset',
    LONG_WAIT_MS: 45000,
    /** Module registry shared by the hub and each module page. */
    MODULES: {
      aa: {
        page: 'additional-asset.html',
        name: 'Additional Asset',
        storageKey: 'aa.apiBase'
      },
      vc: {
        page: 'validation.html',
        name: 'Validation & Catalogue',
        defaultApiBase: 'https://validation-catalogue-recommend.onrender.com',
        storageKey: 'vc.apiBase'
      }
    },
    ASSETS: {
      logo: 'assetcues-logo.png',
      video: 'assetcues-animation.webm'
    },
    DEFAULT_API_BASE: 'https://additional-asset-backend-fastapi.onrender.com',
    ENDPOINTS: {
      analyze: '/api/additional_asset',
      health: '/api/health'
    },
    REQUEST_TIMEOUT_MS: 120000,
    HEALTH_TIMEOUT_MS: 4000,
    MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    ACCEPT_MIME: ['image/jpeg', 'image/png', 'image/webp'],
    ACCEPT_EXT: ['.jpg', '.jpeg', '.png', '.webp'],
    MAX_ID_DIGITS: 12,
    STAGES: [
      { id: 'upload',   label: 'Uploading photos',                    real: true },
      { id: 'prepare',  label: 'Preparing images',                    est: 600 },
      { id: 'identify', label: 'Working out which photo is which',    est: 4500 },
      { id: 'tag',      label: 'Reading the tag & barcode',           est: 2500 },
      { id: 'analyze',  label: 'Analyzing the asset & its condition', est: 4000 },
      { id: 'search',   label: 'Searching your master data',          est: 2200 },
      { id: 'match',    label: 'Matching category & make/model',      est: 1800 }
    ],
    ROTATOR: [
      'Looking closely at your photos…',
      'Checking the tag for a barcode…',
      'Comparing against your master data…',
      'Nearly there — final checks…'
    ],
    LONG_WAIT: 'This is taking longer than usual — still working.',
    GRADES: {
      excellent: { color: 'var(--g-excellent)', bg: 'var(--g-excellent-bg)', icon: 'sparkle' },
      good:      { color: 'var(--g-good)',      bg: 'var(--g-good-bg)',      icon: 'check' },
      fair:      { color: 'var(--g-fair)',      bg: 'var(--g-fair-bg)',      icon: 'info' },
      poor:      { color: 'var(--g-poor)',      bg: 'var(--g-poor-bg)',      icon: 'alert' },
      bad:       { color: 'var(--g-bad)',       bg: 'var(--g-bad-bg)',       icon: 'alert' },
      unknown:   { color: 'var(--g-unknown)',   bg: 'var(--g-unknown-bg)',   icon: 'info' }
    },
    STORAGE: {
      apiBase: 'aa.apiBase',
      customerId: 'aa.customerId',
      introSeen: 'aa.introSeen',
      unlocked: 'aa.unlocked'
    },
    /**
     * Soft access gate (SHA-256 of password + salt).
     * Default password for local/demo: AssetCues#AA
     * To change: set LOCK_SALT, then set LOCK_HASH to hex SHA-256 of (password + LOCK_SALT).
     * See README "Access lock".
     */
    LOCK_ENABLED: true,
    LOCK_SALT: 'aa.frontend.lock.v1',
    LOCK_HASH: 'dd955b7bae7d83930e05d52a26385f7b637c1a4021221b7eacd843658efe0d4f'
  };
  AA.config.MODULES.aa.defaultApiBase = AA.config.DEFAULT_API_BASE;

  AA.state = {
    view: 'idle',
    files: { asset: null, tag: null },
    previews: { asset: null, tag: null },
    dims: { asset: null, tag: null },
    inputs: { customerId: '', assetClassId: '', categoryId: '' },
    request: { xhr: null, startedAt: 0, uploadPct: 0, stageIndex: 0 },
    result: null,
    rawResult: null,
    error: null,
    apiBase: AA.config.DEFAULT_API_BASE,
    health: 'checking',
    mock: null
  };
})(window.AA = window.AA || {});
