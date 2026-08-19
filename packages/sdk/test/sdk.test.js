/**
 * @quilt/sdk — test suite
 *
 * Tests for the five primitives: resolveTemplate, resolveArtifact,
 * validateManifest, publishArtifact, publishRunTrace.
 *
 * Runs with `node --test` (no transpile needed) so it can be invoked
 * before the TypeScript build.
 *
 *   cd packages/sdk && npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveTemplate,
  resolveArtifact,
  validateManifest,
  publishArtifact,
  publishRunTrace,
  InMemoryArtifactStore,
  TemplateError,
  ResolveError,
} from '../src/index.ts';

const store = () => new InMemoryArtifactStore();

// ──────────────────────────────────────────────────────────────────────────
//  resolveTemplate
// ──────────────────────────────────────────────────────────────────────────

test('resolveTemplate: substitutes simple variables', () => {
  assert.equal(
    resolveTemplate('quilt://ml/models/{{name}}', { name: 'classifier' }),
    'quilt://ml/models/classifier',
  );
});

test('resolveTemplate: handles multiple variables in one string', () => {
  assert.equal(
    resolveTemplate('quilt://{{bucket}}/{{name}}:{{version}}', {
      bucket: 'ml',
      name: 'model',
      version: 'v1',
    }),
    'quilt://ml/model:v1',
  );
});

test('resolveTemplate: tolerates whitespace inside braces', () => {
  assert.equal(
    resolveTemplate('quilt://ml/{{ run_id }}', { run_id: 'r01' }),
    'quilt://ml/r01',
  );
});

test('resolveTemplate: throws on missing variable', () => {
  assert.throws(
    () => resolveTemplate('quilt://{{missing}}', {}),
    TemplateError,
  );
});

test('resolveTemplate: returns input unchanged when no tokens present', () => {
  assert.equal(resolveTemplate('quilt://literal/path'), 'quilt://literal/path');
});

// ──────────────────────────────────────────────────────────────────────────
//  resolveArtifact
// ──────────────────────────────────────────────────────────────────────────

test('resolveArtifact: pure resolve (no store) for templated URI', async () => {
  const r = await resolveArtifact('quilt://ml/models:{{run_id}}', { run_id: 'r-01' });
  assert.equal(r.resolvedUri, 'quilt://ml/models:r-01');
  assert.equal(r.version, 'r-01');
});

test('resolveArtifact: rejects non-quilt URIs', async () => {
  await assert.rejects(
    () => resolveArtifact('http://example.com/foo'),
    ResolveError,
  );
});

test('resolveArtifact: pins :latest to most recent version', async () => {
  const s = store();
  // Publish two versions to the same logical URI
  await s.put('quilt://artifacts/data', 'v1 contents', { manifestId: 'data' });
  await new Promise((r) => setTimeout(r, 5));
  await s.put('quilt://artifacts/data', 'v2 contents', { manifestId: 'data' });

  const r = await resolveArtifact('quilt://artifacts/data:latest', {}, s);
  assert.ok(r.resolvedUri.startsWith('quilt://artifacts/data:'), `resolvedUri should be pinned, got ${r.resolvedUri}`);
  assert.ok(r.version.length === 12, `version should be 12-char content hash, got ${r.version}`);
});

test('resolveArtifact: returns metadata from store', async () => {
  const s = store();
  const { uri } = await publishArtifact('hello world', {
    manifestId: 'greeting',
    runId: 'r-01',
    tags: ['test'],
  }, s);
  const r = await resolveArtifact(uri, {}, s);
  assert.ok(r.provenance.createdAt);
});

test('resolveArtifact: templating error is wrapped in ResolveError', async () => {
  await assert.rejects(
    () => resolveArtifact('quilt://ml/{{undefined_var}}', {}),
    ResolveError,
  );
});

// ──────────────────────────────────────────────────────────────────────────
//  validateManifest
// ──────────────────────────────────────────────────────────────────────────

test('validateManifest: accepts a minimal valid manifest', async () => {
  const r = await validateManifest({ id: 'minimal' });
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
});

test('validateManifest: accepts a fully-decorated manifest', async () => {
  const manifest = {
    id: 'train-classifier',
    version: '1.0.0',
    title: 'Train Classifier',
    description: 'Train on staged data',
    inputs: [
      { name: 'dataset', uri: 'quilt://data/staged:latest', required: true, type: 'dataset' },
    ],
    outputs: [
      { name: 'model', uri: 'quilt://models/clf:{{run_id}}', type: 'model' },
    ],
    preconditions: [
      { type: 'artifact_exists', uri: 'quilt://data/staged:latest' },
    ],
    postconditions: [
      { type: 'artifact_exists', uri: 'quilt://models/clf:{{run_id}}' },
    ],
    rollback: { type: 'manifest', manifest_id: 'rollback-train' },
    resource_hints: { gpu: 1, memory_gb: 32, timeout_s: 7200 },
    model_requirements: { llm_context_tokens: 8000, multimodal: false },
    provenance_tags: ['training', 'weekly'],
  };
  const r = await validateManifest(manifest);
  assert.equal(r.valid, true, JSON.stringify(r.errors, null, 2));
});

test('validateManifest: rejects manifest without id', async () => {
  const r = await validateManifest({ title: 'No ID here' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.length > 0);
});

test('validateManifest: rejects bad precondition type', async () => {
  const r = await validateManifest({
    id: 'bad',
    preconditions: [{ type: 'totally_made_up', uri: 'quilt://x' }],
  });
  assert.equal(r.valid, false);
});

test('validateManifest: rejects bad rollback type', async () => {
  const r = await validateManifest({
    id: 'bad',
    rollback: { type: 'time_travel' },
  });
  assert.equal(r.valid, false);
});

test('validateManifest: with checkExists — passes when artifact is present', async () => {
  const s = store();
  await s.put('quilt://data/staged', 'data', { manifestId: 'staged' });
  const r = await validateManifest(
    {
      id: 'needs-data',
      preconditions: [{ type: 'artifact_exists', uri: 'quilt://data/staged:latest' }],
    },
    { store: s, checkExists: true },
  );
  assert.equal(r.valid, true, JSON.stringify(r.errors));
});

test('validateManifest: with checkExists — fails when artifact is absent', async () => {
  const s = store();
  const r = await validateManifest(
    {
      id: 'needs-data',
      preconditions: [{ type: 'artifact_exists', uri: 'quilt://artifacts/never-published:latest' }],
    },
    { store: s, checkExists: true },
  );
  assert.equal(r.valid, false);
  assert.ok(r.errors.length > 0, 'should have at least one error');
  assert.ok(r.errors.some((e) => e.message.includes('No versions found') || e.message.includes('does not exist')));
});

test('validateManifest: with checkExists — substitutes templates in preconditions', async () => {
  const s = store();
  await s.put('quilt://payload/r-42', 'payload', { manifestId: 'payload' });
  const r = await validateManifest(
    {
      id: 'needs-payload',
      preconditions: [{ type: 'artifact_exists', uri: 'quilt://payload/{{runId}}' }],
    },
    { store: s, checkExists: true, runContext: { runId: 'r-42' } },
  );
  assert.equal(r.valid, true, JSON.stringify(r.errors));
});

// ──────────────────────────────────────────────────────────────────────────
//  publishArtifact
// ──────────────────────────────────────────────────────────────────────────

test('publishArtifact: returns canonical URI and content hash', async () => {
  const s = store();
  const result = await publishArtifact(
    'hello world',
    { manifestId: 'greeting', runId: 'r-01', tags: ['test'] },
    s,
  );
  assert.ok(result.uri.startsWith('quilt://artifacts/greeting/r-01:'));
  assert.equal(result.contentHash.length, 64);
  assert.equal(result.version.length, 12);
});

test('publishArtifact: idempotent — same content → same hash', async () => {
  const s = store();
  const a = await publishArtifact('same content', { manifestId: 'a', runId: 'r' }, s);
  const b = await publishArtifact('same content', { manifestId: 'a', runId: 'r' }, s);
  assert.equal(a.contentHash, b.contentHash);
  assert.equal(a.version, b.version);
});

test('publishArtifact: different content → different hash', async () => {
  const s = store();
  const a = await publishArtifact('content A', { manifestId: 'a', runId: 'r' }, s);
  const b = await publishArtifact('content B', { manifestId: 'a', runId: 'r' }, s);
  assert.notEqual(a.contentHash, b.contentHash);
});

test('publishArtifact: can be read back', async () => {
  const s = store();
  const { uri } = await publishArtifact('round-trip me', { manifestId: 'rt', runId: 'r' }, s);
  const got = await s.get(uri);
  assert.equal(new TextDecoder().decode(got.bytes), 'round-trip me');
});

test('publishArtifact: accepts Uint8Array', async () => {
  const s = store();
  const bytes = new TextEncoder().encode('binary data');
  const result = await publishArtifact(bytes, { manifestId: 'bin', runId: 'r' }, s);
  const got = await s.get(result.uri);
  assert.deepEqual(got.bytes, bytes);
});

// ──────────────────────────────────────────────────────────────────────────
//  publishRunTrace
// ──────────────────────────────────────────────────────────────────────────

test('publishRunTrace: stores a complete trace', async () => {
  const s = store();
  const trace = {
    runId: 'run-20260819-01',
    planId: 'plan-abc',
    manifestId: 'train-classifier',
    manifestVersion: '1.0.0',
    startTime: '2026-08-19T11:00:00Z',
    endTime: '2026-08-19T11:42:13Z',
    status: 'success',
    nodes: [
      { nodeId: 'ingest', status: 'success', artifactUris: ['quilt://data/raw:v1'] },
      { nodeId: 'train', status: 'success', artifactUris: ['quilt://models/clf:abc'], logUri: 'quilt://logs/run-01/train.log' },
      { nodeId: 'validate', status: 'success' },
    ],
    provenance: { commit: '9f8a7b', plannerVersion: '1.0.0' },
  };
  const { uri, version } = await publishRunTrace(trace, s);
  assert.ok(uri.includes('runs/train-classifier/run-20260819-01'));
  assert.equal(version.length, 12);

  const got = await s.get(uri);
  const parsed = JSON.parse(new TextDecoder().decode(got.bytes));
  assert.equal(parsed.runId, 'run-20260819-01');
  assert.equal(parsed.nodes.length, 3);
  assert.equal(parsed.status, 'success');
});

test('publishRunTrace: requires runId', async () => {
  const s = store();
  await assert.rejects(
    () => publishRunTrace({ runId: '', status: 'running', nodes: [] }, s),
    /must have a runId/,
  );
});

test('publishRunTrace: requires at least one node', async () => {
  const s = store();
  await assert.rejects(
    () => publishRunTrace({ runId: 'r', status: 'running', nodes: [] }, s),
    /at least one node/,
  );
});

test('publishRunTrace: includes provenance tags in metadata', async () => {
  const s = store();
  const trace = {
    runId: 'r',
    manifestId: 'm',
    startTime: '2026-01-01T00:00:00Z',
    status: 'success',
    nodes: [{ nodeId: 'n1', status: 'success' }],
    replayHint: { tags: ['nightly'] },
  };
  await publishRunTrace(trace, s);
  const entries = s.entries();
  const runTraceEntry = entries.find(([uri]) => uri.includes('runs/m/r'));
  assert.ok(runTraceEntry, 'run trace entry should be present');
  assert.deepEqual(runTraceEntry[1].tags, ['run-trace', 'nightly']);
});

// ──────────────────────────────────────────────────────────────────────────
//  End-to-end: planner-style usage
// ──────────────────────────────────────────────────────────────────────────

test('end-to-end: validate → publish artifact → publish run trace → replay-resolve', async () => {
  const s = store();

  // 1. Publish the input under the URI the manifest will reference
  await s.put('quilt://demo/in', 'input data', { manifestId: 'demo' });

  // 2. Validate a manifest that needs that input
  const manifest = {
    id: 'demo',
    version: '1.0.0',
    inputs: [{ name: 'in', uri: 'quilt://demo/in:latest', required: true }],
    outputs: [{ name: 'out', uri: 'quilt://demo/out:{{run_id}}' }],
    preconditions: [{ type: 'artifact_exists', uri: 'quilt://demo/in:latest' }],
  };
  const v = await validateManifest(manifest, { store: s, checkExists: true });
  assert.equal(v.valid, true, JSON.stringify(v.errors));

  // 3. Run (simulated) — produce output
  const outputPub = await publishArtifact('output data', { manifestId: 'demo', runId: 'r-01' }, s);

  // 4. Publish run trace
  const traceUri = await publishRunTrace({
    runId: 'r-01',
    manifestId: 'demo',
    startTime: '2026-01-01T00:00:00Z',
    endTime: '2026-01-01T00:01:00Z',
    status: 'success',
    nodes: [
      { nodeId: 'process', status: 'success', artifactUris: [outputPub.uri] },
    ],
  }, s);

  // 5. Replay: resolve the input and the trace
  const resolvedIn = await resolveArtifact('quilt://demo/in:latest', {}, s);
  assert.ok(resolvedIn.resolvedUri.startsWith('quilt://demo/in:'));

  const traceResolved = await s.get(traceUri.uri);
  const trace = JSON.parse(new TextDecoder().decode(traceResolved.bytes));
  assert.equal(trace.runId, 'r-01');
  assert.equal(trace.nodes[0].artifactUris[0], outputPub.uri);
});
