// Run with `npm test`. Client-side password checks mirror the API's Password::defaults()
// (jahez_api AppServiceProvider: at least 12 characters, at most 72 bytes, the bcrypt limit),
// and a password is sent exactly as typed: login never trims it, so registration must not either.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_PASSWORD_LENGTH, appendSecret, passwordIssue } from '../src/lib/password.ts';

test('a password shorter than the platform minimum is refused', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 12);
  assert.notEqual(passwordIssue('elevenchars', 'elevenchars'), null);
  assert.equal(passwordIssue('twelve chars', 'twelve chars'), null);
});

test('the length counts characters, not UTF-16 units', () => {
  const arabic = 'كلمةمرورطويلة'; // 13 Arabic letters
  assert.equal(passwordIssue(arabic, arabic), null);
});

test('a password over 72 bytes is refused even when it has few characters', () => {
  const longArabic = 'ك'.repeat(37); // 37 characters, 74 bytes
  assert.notEqual(passwordIssue(longArabic, longArabic), null);
  const fits = 'ك'.repeat(36); // 72 bytes
  assert.equal(passwordIssue(fits, fits), null);
});

test('the confirmation must match', () => {
  assert.notEqual(passwordIssue('correct horse battery', 'correct horse batter'), null);
});

test('a secret is appended exactly as typed, spaces included', () => {
  const form = new FormData();
  appendSecret(form, 'password', '  spaced secret pass  ');
  assert.equal(form.get('password'), '  spaced secret pass  ');
});

test('an empty secret is not appended', () => {
  const form = new FormData();
  appendSecret(form, 'password', '');
  assert.equal(form.has('password'), false);
});
