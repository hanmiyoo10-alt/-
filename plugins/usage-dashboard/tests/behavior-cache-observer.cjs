'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {startBridge} = require('./harness/bridge-process.cjs');
const {runCaptureTap} = require('./harness/capture-tap-process.cjs');

function row(rows, requestNumber) {
  const found = rows.find((item) => item.requestNumber === requestNumber);
  assert.ok(found, `missing captured request: ${requestNumber}`);
  return found;
}

const timestamp = '2026-08-19T10:00:00.000Z';
const logs = [
  {
    requestId:'llmgateway-explicit',createdAt:timestamp,usedProvider:'gateway',usedModel:'fixture/model',
    promptTokens:12000,completionTokens:500,totalTokens:12500,
    cachedTokens:8000,cacheWriteTokens:1200,cacheWrite5mTokens:1000,cacheWrite1hTokens:200,
    requestBody:'must-not-persist',responseBody:'must-not-persist',messages:['must-not-persist'],
    authorization:'must-not-persist',apiKey:'must-not-persist',cookie:'must-not-persist',
  },
  {
    requestId:'llmgateway-read-only',createdAt:timestamp,usedProvider:'gateway',usedModel:'fixture/model',
    cachedTokens:2048,cacheWriteTokens:null,cacheWrite5mTokens:null,cacheWrite1hTokens:null,
  },
  {
    requestId:'anthropic',createdAt:timestamp,usedProvider:'anthropic',usedModel:'claude-fixture',
    usage:{input_tokens:100,output_tokens:20,cache_read_input_tokens:60,cache_creation_input_tokens:30,
      cache_creation:{ephemeral_5m_input_tokens:20,ephemeral_1h_input_tokens:10}},
  },
  {
    requestId:'anthropic-ttl-only',createdAt:timestamp,usedProvider:'anthropic',usedModel:'claude-fixture',
    usage:{input_tokens:100,cache_read_input_tokens:40,
      cache_creation:{ephemeral_5m_input_tokens:12,ephemeral_1h_input_tokens:8}},
  },
  {
    requestId:'gemini',createdAt:timestamp,usedProvider:'google',usedModel:'gemini-fixture',
    usageMetadata:{promptTokenCount:120,candidatesTokenCount:25,cachedContentTokenCount:80,totalTokenCount:145},
  },
  {
    requestId:'openai-chat',createdAt:timestamp,usedProvider:'openai',usedModel:'chat-fixture',
    usage:{prompt_tokens:90,completion_tokens:11,prompt_tokens_details:{cached_tokens:50,cache_write_tokens:7}},
  },
  {
    requestId:'openai-responses',createdAt:timestamp,usedProvider:'openai',usedModel:'responses-fixture',
    usage:{input_tokens:75,output_tokens:9,input_tokens_details:{cached_tokens:44,cache_write_tokens:6}},
  },
  {
    requestId:'gateway-generic',createdAt:timestamp,usedProvider:'gateway',usedModel:'generic-fixture',
    usage:{inputTokens:55,outputTokens:5,cachedTokens:33,cacheWriteTokens:4},
  },
  {
    requestId:'no-cache',createdAt:timestamp,usedProvider:'fixture',usedModel:'plain-fixture',
    usage:{input_tokens:10,output_tokens:2},
  },
];

(async () => {
  const bridge = await startBridge({managed:false,direct:true});
  try {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    const tapPath = path.join(bridge.paths.home, '.config', 'llmgateway-devpass-bridge', 'capture-orgs.cjs');
    assert.equal(fs.statSync(tapPath).isFile(), true, 'Engine must materialize the exact capture tap');

    const captured = await runCaptureTap({
      tapPath,
      fixtureRoot:bridge.fixtureRoot,
      payloads:{
        orgs:{organizations:[{id:'fixture-devpass',kind:'devpass',status:'active'}]},
        status:{projectId:'fixture-project',organizationId:'fixture-devpass',devPlan:'pro'},
        activity:{activity:[{requestCount:1,inputTokens:10,outputTokens:2,totalTokens:12,cost:0.01}]},
        logs:{logs},
      },
    });

    const rows = captured?.devpassLogs?.rows;
    assert.equal(Array.isArray(rows), true);
    assert.equal(rows.length, logs.length);

    const explicit = row(rows, 'llmgateway-explicit');
    assert.equal(explicit.cacheMetricSource, 'llmgateway-log-cache-v1');
    assert.equal(explicit.cacheReadInputTokens, 8000);
    assert.equal(explicit.cacheCreationInputTokens, 1200);
    assert.equal(explicit.cacheCreation5mTokens, 1000);
    assert.equal(explicit.cacheCreation1hTokens, 200);
    assert.equal(explicit.cachedInputTokens, 9200);
    assert.equal(explicit.cacheMetricFidelity, 'explicit-read-write');
    assert.equal(explicit.cacheWriteTelemetry, 'reported');
    assert.equal(explicit.cacheTtlTelemetry, 'reported');

    const readOnly = row(rows, 'llmgateway-read-only');
    assert.equal(readOnly.cacheReadInputTokens, 2048);
    assert.equal(readOnly.cacheCreationInputTokens, null);
    assert.equal(readOnly.cacheMetricFidelity, 'explicit-read');
    assert.equal(readOnly.cacheWriteTelemetry, 'not-reported');
    assert.equal(readOnly.cacheTtlTelemetry, 'unknown');

    const anthropic = row(rows, 'anthropic');
    assert.equal(anthropic.cacheMetricSource, 'anthropic-usage');
    assert.equal(anthropic.cacheReadInputTokens, 60);
    assert.equal(anthropic.cacheCreationInputTokens, 30);
    assert.equal(anthropic.cachedInputTokens, 90);

    const ttlOnly = row(rows, 'anthropic-ttl-only');
    assert.equal(ttlOnly.cacheCreationInputTokens, 20);
    assert.equal(ttlOnly.cachedInputTokens, 60);

    const gemini = row(rows, 'gemini');
    assert.equal(gemini.cacheMetricSource, 'gemini-usage');
    assert.equal(gemini.cachedInputTokens, 80);
    assert.equal(gemini.cacheReadInputTokens, null);
    assert.equal(gemini.cacheCreationInputTokens, null);

    const openAiChat = row(rows, 'openai-chat');
    assert.equal(openAiChat.cacheMetricSource, 'openai-chat-usage');
    assert.equal(openAiChat.cachedInputTokens, 50);
    assert.equal(openAiChat.cacheReadInputTokens, null);
    assert.equal(openAiChat.cacheCreationInputTokens, 7);

    const openAiResponses = row(rows, 'openai-responses');
    assert.equal(openAiResponses.cacheMetricSource, 'openai-responses-usage');
    assert.equal(openAiResponses.cachedInputTokens, 44);
    assert.equal(openAiResponses.cacheCreationInputTokens, 6);

    const generic = row(rows, 'gateway-generic');
    assert.equal(generic.cacheMetricSource, 'llmgateway-usage');
    assert.equal(generic.cachedInputTokens, 33);
    assert.equal(generic.cacheReadInputTokens, null);
    assert.equal(generic.cacheCreationInputTokens, 4);

    const plain = row(rows, 'no-cache');
    assert.equal(plain.cachedInputTokens, null);
    assert.equal(plain.cacheReadInputTokens, null);
    assert.equal(plain.cacheCreationInputTokens, null);
    assert.equal(plain.cacheMetricFidelity, 'unknown');
    assert.equal(plain.cacheMetricSource, '');

    const serialized = JSON.stringify(captured);
    assert.ok(!serialized.includes('must-not-persist'));
    for (const forbidden of ['requestBody','responseBody','messages','authorization','apiKey','cookie']) {
      assert.equal(Object.prototype.hasOwnProperty.call(explicit, forbidden), false, `capture leaked ${forbidden}`);
    }

    console.log('usage-dashboard cache observer behavior: OK · exact generated capture tap preserves provider fidelity, UNKNOWN, and privacy');
  } finally {
    await bridge.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
