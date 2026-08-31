import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

const source = await fs.readFile(new URL('./exposure-model-compliance-m1-host-adapter.js', import.meta.url), 'utf8');

const callbacks = { replacer: null, body: null, output: null, unload: null, setting: null };
const calls = { removedReplacer: 0, unregisteredBody: 0, removedOutput: 0, unregisteredUi: 0 };
const risuai = {
  async requestPluginPermission(permission) { assert.equal(permission, 'replacer'); return true; },
  async registerSetting(name, cb, icon, iconType, id) { assert.equal(id, 'simcore-exposure-m1-eval'); callbacks.setting = cb; return { id: 'ui-1' }; },
  async showContainer() {},
  async addRisuReplacer(type, fn) { assert.equal(type, 'beforeRequest'); callbacks.replacer = fn; },
  async removeRisuReplacer(type, fn) { assert.equal(type, 'beforeRequest'); assert.equal(fn, callbacks.replacer); calls.removedReplacer += 1; },
  async registerBodyIntercepter(fn) { callbacks.body = fn; return { id: 'body-1' }; },
  async unregisterBodyIntercepter(id) { assert.equal(id, 'body-1'); calls.unregisteredBody += 1; },
  async addRisuChatListener(mode, fn) { assert.equal(mode, 'output'); callbacks.output = fn; },
  async removeRisuChatListener(mode, fn) { assert.equal(mode, 'output'); assert.equal(fn, callbacks.output); calls.removedOutput += 1; },
  async unregisterUIPart(id) { assert.equal(id, 'ui-1'); calls.unregisteredUi += 1; },
  async onUnload(fn) { callbacks.unload = fn; },
  async getCharacter() { return { name: 'Fixture Character', description: 'stable reference', chats: [{ message: ['volatile'] }] }; },
  async getDatabase(keys) {
    assert.ok(Array.isArray(keys));
    return { temperature: 70, maxContext: 120000, maxResponse: 4096, frequencyPenalty: 0, PresensePenalty: 0, seperateModelsForAxModels: false, seperateModels: {} };
  },
};

const context = vm.createContext({ console, crypto: webcrypto, TextEncoder, TextDecoder, risuai, Risuai: risuai, setTimeout, clearTimeout });
vm.runInContext(source, context, { filename: 'exposure-model-compliance-m1-host-adapter.js' });
for (let i = 0; i < 20 && !callbacks.unload; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));

assert.ok(callbacks.replacer);
assert.ok(callbacks.body);
assert.ok(callbacks.output);
assert.ok(callbacks.unload);
const control = context.__SIMCORE_EXPOSURE_M1_EVAL__;
assert.ok(control);
assert.equal(control.status().activeRun, null);
assert.equal(control.status().replacerRegistered, true);
assert.equal(control.status().bodyInterceptorRegistered, true);
assert.equal(control.constants.expectedCandidateHash, '3742294b9254ac1d9081f4eb655c3c595b7dfb422fcb93bd3617a0632c4b76cc');

const anchor = control.constants.sourceProvenanceAnchor;
const newSourceLine = 'short_community_request_reused_with_new_source=B';
const baseMessages = () => ([
  { role: 'system', content: `stable\n${anchor}\n${newSourceLine}\ntail` },
  { role: 'user', content: '[커뮤니티]' },
]);

await control.arm({ runId: 'M1:fixture-b0:T1:X', condition: 'B0', expectedSyntheticScenarioFingerprint: 'a'.repeat(64) });
const b0Input = baseMessages();
const b0Out = await callbacks.replacer(b0Input, 'model');
assert.equal(b0Out, b0Input);
assert.equal(control.status().activeRun.beforeRequestInvocationCount, 1);
const b0Body = { model: 'test-model', messages: b0Out, temperature: 0.7 };
assert.equal(await callbacks.body(b0Body, 'model'), b0Body);
await callbacks.output({ chat: { message: [{ role: 'char', data: 'B0 output', generationInfo: { model: 'test-model' } }] }, messageIndex: 0 });
const b0Receipt = control.latestReceipt();
assert.equal(b0Receipt.condition, 'B0');
assert.equal(b0Receipt.materializationStatus, 'HOST_CAPTURE_COMPLETE');
assert.equal(b0Receipt.beforeRequestInputFingerprint, b0Receipt.flattenedMessageFingerprint);
assert.equal(b0Receipt.providerCandidateLineMatchCount, 0);
assert.equal(b0Receipt.providerPropagationStatus, 'MATCH');
assert.equal(b0Receipt.modelIdentifier, 'test-model');
assert.ok(b0Receipt.actualHostRequestFingerprint);
assert.ok(b0Receipt.modelSettingsFingerprint);
assert.ok(b0Receipt.characterReferenceFingerprint);

await control.arm({ runId: 'M1:fixture-e6:T1:Y', condition: 'E6', expectedSyntheticScenarioFingerprint: 'b'.repeat(64) });
const e6Input = baseMessages();
const originalSystem = e6Input[0].content;
const e6Out = await callbacks.replacer(e6Input, 'model');
assert.notEqual(e6Out, e6Input);
assert.equal(e6Input[0].content, originalSystem);
assert.notEqual(e6Out[0], e6Input[0]);
const e6Lines = e6Out[0].content.split('\n');
const anchorIndex = e6Lines.indexOf(anchor);
assert.ok(anchorIndex >= 0);
assert.deepEqual(e6Lines.slice(anchorIndex + 1, anchorIndex + 7), Array.from(control.constants.exposureLines));
assert.equal(e6Lines[anchorIndex + 7], newSourceLine);
for (const line of control.constants.exposureLines) assert.equal(e6Lines.filter((x) => x === line).length, 1);

const e6Retry = await callbacks.replacer(e6Input, 'model');
assert.equal(control.status().activeRun.beforeRequestInvocationCount, 2);
assert.deepEqual(e6Retry[0].content.split('\n').slice(anchorIndex + 1, anchorIndex + 7), Array.from(control.constants.exposureLines));
const e6Body = { model: 'test-model', messages: e6Retry, temperature: 0.7 };
await callbacks.body(e6Body, 'model');
await callbacks.output({ chat: { message: [{ role: 'assistant', content: 'E6 output', generationInfo: { modelName: 'test-model' } }] }, messageIndex: 0 });
const e6Receipt = control.latestReceipt();
assert.equal(e6Receipt.condition, 'E6');
assert.equal(e6Receipt.providerCandidateLineMatchCount, 6);
assert.equal(e6Receipt.providerPropagationStatus, 'MATCH');
assert.equal(e6Receipt.retryObserved, true);
assert.deepEqual(Array.from(e6Receipt.candidatePresenceAfter), [1, 1, 1, 1, 1, 1]);

await control.arm({ runId: 'M1:collision:T1:X', condition: 'E6', expectedSyntheticScenarioFingerprint: 'c'.repeat(64) });
const collisionFirst = baseMessages();
await callbacks.replacer(collisionFirst, 'model');
const collisionSecond = baseMessages();
collisionSecond[1] = { role: 'user', content: 'different request' };
const collisionOut = await callbacks.replacer(collisionSecond, 'model');
assert.equal(collisionOut, collisionSecond);
assert.equal(control.status().activeRun.state, 'INVALID');
assert.equal(control.status().activeRun.invalidReason, 'MULTI_REQUEST_COLLISION');
assert.equal(control.disarm('TEST_RESET'), true);

await control.arm({ runId: 'M1:preexisting:T1:Y', condition: 'E6', expectedSyntheticScenarioFingerprint: 'd'.repeat(64) });
const preexisting = baseMessages();
preexisting[0].content += `\n${control.constants.exposureLines[0]}`;
assert.equal(await callbacks.replacer(preexisting, 'model'), preexisting);
assert.equal(control.status().activeRun.state, 'INVALID');
assert.equal(control.status().activeRun.invalidReason, 'CANDIDATE_ALREADY_PRESENT');
control.disarm('TEST_RESET');

await control.arm({ runId: 'M1:noanchor:T1:X', condition: 'B0', expectedSyntheticScenarioFingerprint: 'e'.repeat(64) });
const noAnchor = [{ role: 'system', content: 'no anchor here' }];
assert.equal(await callbacks.replacer(noAnchor, 'model'), noAnchor);
assert.equal(control.status().activeRun.invalidReason, 'ANCHOR_MISSING');
control.disarm('TEST_RESET');

const idle = baseMessages();
assert.equal(await callbacks.replacer(idle, 'model'), idle);

await callbacks.unload();
assert.equal(calls.removedReplacer, 1);
assert.equal(calls.unregisteredBody, 1);
assert.equal(calls.removedOutput, 1);
assert.equal(calls.unregisteredUi, 1);
assert.equal(control.status().unloaded, true);
assert.equal(control.status().replacerRegistered, false);

console.log('exposure-model-compliance-m1-host-adapter: PASS');
