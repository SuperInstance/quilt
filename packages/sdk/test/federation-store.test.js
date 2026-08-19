// SPDX-License-Identifier: Apache-2.0
//
// federation-store.test.js — Tests for FederatedArtifactStore + MqttCellTransport
//
// These tests cover the new v0.6.0 additions to the SDK:
//   - FederatedArtifactStore (R2-backed, multi-tier cache)
//   - MemoryCacheBackend
//   - MqttCellTransport
//   - mqttTopicMatches
//
// The tests use mock R2 / mock MQTT clients to avoid external dependencies.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FederatedArtifactStore,
  MemoryCacheBackend,
  MqttCellTransport,
  mqttTopicMatches,
} from '../src/index.ts';

const SAMPLE = (n) => new TextEncoder().encode(`hello-${n}`);

test('FederatedArtifactStore — basic put/get with in-memory local', async () => {
  const store = new FederatedArtifactStore();
  const { uri, version } = await store.put('quilt://bucket/sheet', SAMPLE(1), {
    name: 'sheet',
    type: 'text/plain',
  });
  assert.ok(uri);
  assert.ok(version);
  const got = await store.get(uri);
  assert.equal(new TextDecoder().decode(got.bytes), 'hello-1');
});

test('FederatedArtifactStore — get throws when not found', async () => {
  const store = new FederatedArtifactStore();
  await assert.rejects(store.get('quilt://missing/thing'), /not found/);
});

test('FederatedArtifactStore — listVersions', async () => {
  const store = new FederatedArtifactStore();
  await store.put('quilt://bucket/sheet', SAMPLE(1), { name: 'sheet', type: 'text/plain' });
  await store.put('quilt://bucket/sheet', SAMPLE(2), { name: 'sheet', type: 'text/plain', version: 'v2' });
  const versions = await store.listVersions('quilt://bucket/sheet');
  assert.ok(versions.length >= 2);
});

test('FederatedArtifactStore — R2 tier puts are best-effort (failure does not break put)', async () => {
  let putCount = 0;
  const r2 = {
    put: async () => { putCount++; throw new Error('simulated R2 down'); },
    get: async () => null,
  };
  const store = new FederatedArtifactStore({ r2, r2Bucket: 'fake', log: () => {} });
  const { uri } = await store.put('quilt://bucket/sheet', SAMPLE(1), { name: 'sheet', type: 'text/plain' });
  assert.equal(putCount, 1);
  // Local still works
  const got = await store.get(uri);
  assert.equal(new TextDecoder().decode(got.bytes), 'hello-1');
});

test('FederatedArtifactStore — R2 get promotes to local', async () => {
  const r2Data = SAMPLE(99);
  const r2 = {
    put: async () => {},
    get: async (_key) => ({
      body: new ReadableStream({ start(c) { c.enqueue(r2Data); c.close(); } }),
    }),
  };
  const store = new FederatedArtifactStore({ r2, r2Bucket: 'fake', log: () => {} });
  const got = await store.get('quilt://bucket/sheet:v99');
  assert.equal(new TextDecoder().decode(got.bytes), 'hello-99');
  // Hot cache should now have it
  const stats = store.hotStats();
  assert.ok(stats.entries >= 1);
});

test('FederatedArtifactStore — exists checks all tiers', async () => {
  // r2Key strips `quilt://` prefix, so `quilt://b/s:v1` → `b/s:v1`
  const r2 = { put: async () => {}, get: async (k) => k === 'b/s:v1' ? { body: new ReadableStream() } : null };
  const store = new FederatedArtifactStore({ r2, r2Bucket: 'fake', log: () => {} });
  assert.equal(await store.exists('quilt://b/s:v1'), true);
  assert.equal(await store.exists('quilt://b/s:v2'), false);
});

test('FederatedArtifactStore — invalidate removes from all tiers', async () => {
  const r2 = { put: async () => {}, get: async () => null, delete: async () => {} };
  const store = new FederatedArtifactStore({ r2, r2Bucket: 'fake', log: () => {} });
  const { uri } = await store.put('quilt://bucket/sheet', SAMPLE(1), { name: 'sheet', type: 'text/plain' });
  await store.invalidate(uri);
  await assert.rejects(store.get(uri), /not found/);
});

test('FederatedArtifactStore — LRU eviction when over maxLocalBytes', async () => {
  // 100-byte max
  const store = new FederatedArtifactStore({ maxLocalBytes: 100, log: () => {} });
  // Each put adds ~50 bytes of payload
  await store.put('quilt://b/a', SAMPLE(1), { name: 'a', type: 'text/plain' });
  await store.put('quilt://b/b', SAMPLE(2), { name: 'b', type: 'text/plain' });
  await store.put('quilt://b/c', SAMPLE(3), { name: 'c', type: 'text/plain' });
  // Hot cache should have evicted at least one entry
  const stats = store.hotStats();
  assert.ok(stats.bytes <= 100, `bytes=${stats.bytes} should be <= 100`);
});

test('FederatedArtifactStore — custom local backend', async () => {
  const customLocal = new MemoryCacheBackend();
  const store = new FederatedArtifactStore({ local: customLocal });
  const { uri } = await store.put('quilt://b/s', SAMPLE(1), { name: 's', type: 'text/plain' });
  // Hot cache + local both have it
  assert.equal(await customLocal.get(uri) !== null, true);
});

test('MemoryCacheBackend — basic put/get', async () => {
  const c = new MemoryCacheBackend();
  await c.put('k', SAMPLE(1), { name: 'k', type: 'text/plain' });
  const r = await c.get('k');
  assert.equal(new TextDecoder().decode(r.bytes), 'hello-1');
  await c.delete('k');
  assert.equal(await c.get('k'), null);
});

test('MemoryCacheBackend — list with prefix', async () => {
  const c = new MemoryCacheBackend();
  await c.put('a/1', SAMPLE(1), { name: '1', type: 'text/plain' });
  await c.put('a/2', SAMPLE(2), { name: '2', type: 'text/plain' });
  await c.put('b/1', SAMPLE(3), { name: '1', type: 'text/plain' });
  const aList = await c.list('a/');
  assert.equal(aList.length, 2);
});

test('mqttTopicMatches — exact', () => {
  assert.equal(mqttTopicMatches('a/b/c', 'a/b/c'), true);
  assert.equal(mqttTopicMatches('a/b/c', 'a/b/d'), false);
  assert.equal(mqttTopicMatches('a/b/c', 'a/b'), false);
});

test('mqttTopicMatches — single-level wildcard +', () => {
  assert.equal(mqttTopicMatches('a/+/c', 'a/b/c'), true);
  assert.equal(mqttTopicMatches('a/+/c', 'a/x/y/c'), false);
  assert.equal(mqttTopicMatches('+/b/c', 'a/b/c'), true);
});

test('mqttTopicMatches — multi-level wildcard #', () => {
  assert.equal(mqttTopicMatches('a/#', 'a/b/c/d'), true);
  assert.equal(mqttTopicMatches('#', 'anything/here'), true);
  assert.equal(mqttTopicMatches('a/#', 'b/c'), false);
});

test('MqttCellTransport — publish → subscribe round-trip', () => {
  // Mock client
  const subs = new Map();
  const handlers = { message: [], connect: [], error: [], close: [] };
  const mockClient = {
    on(event, cb) { handlers[event].push(cb); },
    subscribe(topic, opts, cb) { subs.set(topic, (subs.get(topic) || []).concat({ cb, opts })); if (cb) cb(null); },
    publish(_topic, _payload, _opts) { /* simulate broker delivering to subs */ },
    end() {},
  };
  const transport = new MqttCellTransport(mockClient, { url: 'mqtt://test' });
  let received = null;
  const unsub = transport.subscribe('quilt://inst/sheet#cell', (v) => { received = v; });
  // Simulate broker delivering a message on the proper topic
  const topic = 'quilt/inst/sheet/cell';
  const payload = new TextEncoder().encode(JSON.stringify({ value: 42 }));
  for (const h of handlers.message) h(topic, payload);
  assert.deepEqual(received, { value: 42 });
  unsub();
});

test('MqttCellTransport — getValue resolves from retained message', async () => {
  const handlers = { message: [], connect: [], error: [], close: [] };
  const mockClient = {
    on(event, cb) { handlers[event].push(cb); },
    subscribe(topic, opts, cb) { if (cb) cb(null); },
    publish() {},
    end() {},
  };
  const transport = new MqttCellTransport(mockClient, { url: 'mqtt://test' });
  // Kick off the get
  const promise = transport.getValue('quilt://inst/sheet#cell', 200);
  // Simulate delivery after 10ms
  setTimeout(() => {
    const topic = 'quilt/inst/sheet/cell';
    const payload = new TextEncoder().encode(JSON.stringify('hello'));
    for (const h of handlers.message) h(topic, payload);
  }, 10);
  const value = await promise;
  assert.equal(value, 'hello');
});

test('MqttCellTransport — getValue times out', async () => {
  const handlers = { message: [], connect: [], error: [], close: [] };
  const mockClient = {
    on(event, cb) { handlers[event].push(cb); },
    subscribe(topic, opts, cb) { if (cb) cb(null); },
    publish() {},
    end() {},
  };
  const transport = new MqttCellTransport(mockClient, { url: 'mqtt://test' });
  // Use short timeout for test speed
  await assert.rejects(
    transport.getValue('quilt://missing/sheet#cell', 50),
    /timeout/,
  );
});

test('MqttCellTransport — isConnected reflects connect/close', () => {
  const handlers = { message: [], connect: [], error: [], close: [] };
  const mockClient = {
    on(event, cb) { handlers[event].push(cb); },
    subscribe() {}, publish() {}, end() {},
  };
  const transport = new MqttCellTransport(mockClient, { url: 'mqtt://test' });
  assert.equal(transport.isConnected(), false);
  handlers.connect[0]();
  assert.equal(transport.isConnected(), true);
  handlers.close[0]();
  assert.equal(transport.isConnected(), false);
});
