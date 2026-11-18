'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {check} = require('../scripts/asset-release.cjs');

// Versioned assets are cached immutable; a content change without a new ?v= would strand visitors on old code.
test('every changed JS/CSS asset ships under a new version (run `npm run release:stamp` after editing)', () => {
    const result = check();
    assert.equal(result.ok, true);
    assert.ok(result.assets >= 10);
});
