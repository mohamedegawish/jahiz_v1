// Run with `npm test`. The landing ad rotation period is an admin setting stored by the API
// (landing settings `ad_rotation_seconds`), so every visitor gets the period the admin chose.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROTATION_SECONDS, MAX_ROTATION_SECONDS, MIN_ROTATION_SECONDS, rotationSeconds } from '../src/lib/rotation.ts';

test('the stored period applies to every visitor', () => {
  assert.equal(rotationSeconds({ ad_rotation_seconds: 9 }), 9);
});

test('no settings, or no stored period, falls back to the default', () => {
  assert.equal(rotationSeconds(null), DEFAULT_ROTATION_SECONDS);
  assert.equal(rotationSeconds({ ad_rotation_seconds: null }), DEFAULT_ROTATION_SECONDS);
});

test('a period outside the allowed range falls back to the default', () => {
  assert.equal(rotationSeconds({ ad_rotation_seconds: MIN_ROTATION_SECONDS - 1 }), DEFAULT_ROTATION_SECONDS);
  assert.equal(rotationSeconds({ ad_rotation_seconds: MAX_ROTATION_SECONDS + 1 }), DEFAULT_ROTATION_SECONDS);
  assert.equal(rotationSeconds({ ad_rotation_seconds: 2.5 }), DEFAULT_ROTATION_SECONDS);
});
