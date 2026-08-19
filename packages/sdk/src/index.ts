/**
 * @quilt/sdk — agent substrate primitives
 *
 * Five functions that turn Quilt sheets into executable, auditable,
 * replayable artifacts. This is the minimal surface area that any
 * planner, runtime, or UI needs to compose Quilt sheets into agentic
 * workflows.
 *
 *   1. resolveTemplate(uri, context)  — substitute {{var}} tokens
 *   2. resolveArtifact(uri, context)  — resolve a Quilt URI to a pinned version
 *   3. validateManifest(manifest)     — JSON Schema validation + precondition checks
 *   4. publishArtifact(path, meta)    — upload an artifact, get back a canonical URI
 *   5. publishRunTrace(trace)         — write an immutable run trace to Quilt
 *
 * Why these five? They are the minimum surface that lets:
 *   - planners compile goals into manifest DAGs,
 *   - runtimes execute those DAGs transactionally,
 *   - agents query the past and learn from it,
 *   - UIs show users what is happening with full provenance.
 *
 * Everything else (UI, scheduler, model router) is built on top of these.
 *
 * The SDK is intentionally side-effect-free by default. `resolveArtifact`,
 * `validateManifest`, and `resolveTemplate` are pure functions of their
 * inputs. `publishArtifact` and `publishRunTrace` take a transport
 * (`ArtifactStore`) so callers can wire any backend (Cloudflare R2,
 * local FS, in-memory mock for tests).
 *
 * See `manifest.schema.json` for the manifest format these primitives
 * operate on.
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Re-export the schema for convenience — consumers can import the JSON
// directly, but having it exported from the package means types and
// schema travel together.
export { default as manifestSchema } from '../../../schemas/manifest.schema.json' with { type: 'json' };

// ──────────────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────────────

/**
 * A Quilt URI of the form `quilt://bucket/name:version`. Version is
 * optional — `quilt://bucket/name` means "resolve to the latest pinned
 * version". `quilt://cells/foo.bar` refers to a cell value in a sheet
 * (the canonical cell addressing scheme).
 */
export type QuiltURI = string;

/**
 * The result of resolving a Quilt URI. `version` is always set after
 * resolution (`:latest` is pinned). `localPath` and `signedUrl` are
 * optional because some artifacts are computed (cells) rather than
 * fetched.
 */
export interface ResolvedArtifact {
  /** The original URI that was passed in. */
  uri: QuiltURI;
  /** The version this URI resolved to. */
  version: string;
  /** The fully-resolved URI with explicit version. */
  resolvedUri: QuiltURI;
  /** Local materialized path, if the artifact was downloaded. */
  localPath?: string;
  /** Time-limited signed URL for remote fetch, if applicable. */
  signedUrl?: string;
  /** Free-form metadata returned by the store. */
  metadata: Record<string, unknown>;
  /** Provenance information: who made it, when, from what. */
  provenance: {
    createdAt: string;
    originCommit?: string;
    manifestId?: string;
  };
}

/**
 * The context object passed alongside any resolve/validate call. The
 * runtime injects run_id, timestamp, commit, and any planner-provided
 * variables. Templates may reference any of these as `{{key}}`.
 */
export interface RunContext {
  runId?: string;
  timestamp?: string;
  commit?: string;
  plannerVersion?: string;
  [key: string]: string | undefined;
}

/**
 * Result of manifest validation. `valid: true` means the manifest
 * conforms to the schema and (if requested) all artifact preconditions
 * are met.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
}

/**
 * Metadata attached to a published artifact. Becomes the artifact's
 * provenance record.
 */
export interface ArtifactMetadata {
  /** Schema version of the manifest, e.g. "1.0.0". */
  version?: string;
  /** Free-form tags for search and grouping. */
  tags?: string[];
  /** SHA-256 of the artifact bytes; computed if not provided. */
  contentHash?: string;
  /** MIME type, e.g. "application/json". */
  contentType?: string;
  /** The manifest_id of the sheet that produced this artifact. */
  manifestId?: string;
  /** The run_id of the execution that produced this artifact. */
  runId?: string;
  /** Any additional free-form metadata. */
  [key: string]: unknown;
}

/**
 * A run trace — the canonical, immutable record of one execution. Every
 * run_trace is itself an artifact in Quilt, with a canonical URI.
 */
export interface RunTrace {
  runId: string;
  planId?: string;
  manifestId?: string;
  manifestVersion?: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'aborted';
  nodes: RunTraceNode[];
  provenance?: {
    commit?: string;
    plannerVersion?: string;
    manifestId?: string;
  };
  replayHint?: {
    priority?: number;
    tags?: string[];
  };
}

export interface RunTraceNode {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'rolledback';
  startTime?: string;
  endTime?: string;
  exitCode?: number;
  artifactUris?: QuiltURI[];
  logUri?: QuiltURI;
  error?: string;
}

/**
 * An abstract artifact store. The default in-memory implementation is
 * used for tests; production wire-ups provide a Cloudflare R2, S3, or
 * local-filesystem implementation.
 *
 * The store is content-addressed: callers provide a `logicalUri` (the
 * path before `:version`) and the store computes a version from the
 * content hash. The full URI returned is `${logicalUri}:${version}`.
 */
export interface ArtifactStore {
  /** Store bytes under a logical URI. Returns the canonical URI + version. */
  put(logicalUri: QuiltURI, bytes: Uint8Array | string, metadata: ArtifactMetadata): Promise<{ uri: QuiltURI; version: string }>;
  /** Fetch bytes by full URI. */
  get(uri: QuiltURI): Promise<{ bytes: Uint8Array; metadata: ArtifactMetadata }>;
  /** Check if an artifact exists. */
  exists(uri: QuiltURI): Promise<boolean>;
  /** List versions of a logical artifact (without :version). */
  listVersions(logicalUri: QuiltURI): Promise<{ version: string; createdAt: string }[]>;
}

// ──────────────────────────────────────────────────────────────────────────
//  Primitive 1: resolveTemplate
// ──────────────────────────────────────────────────────────────────────────

/**
 * Substitute `{{key}}` tokens in a URI or path string with values from
 * the run context. Unknown keys cause a fail-fast error — silent
 * templating is the source of most reproducibility bugs.
 *
 * For ergonomics, `{{run_id}}` and `{{runId}}` both look up the same
 * value (snake_case ↔ camelCase). The lookup is case-insensitive and
 * ignores underscores.
 *
 * @example
 *   resolveTemplate("quilt://ml/models/classifier:{{run_id}}", { runId: "run-01" })
 *   // → "quilt://ml/models/classifier:run-01"
 *
 *   resolveTemplate("quilt://data/{{dataset}}", { dataset: "imagenet" })
 *   // → "quilt://data/imagenet"
 */
export function resolveTemplate(input: string, context: RunContext = {}): string {
  // Build a normalized lookup: lowercase, no underscores
  const norm = (s: string) => s.toLowerCase().replace(/_/g, '');
  const lookup = new Map<string, string>();
  for (const [k, v] of Object.entries(context)) {
    if (v !== undefined) lookup.set(norm(k), v);
  }
  return input.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    const v = lookup.get(norm(key));
    if (v === undefined) {
      throw new TemplateError(
        `Missing template variable: ${key}. ` +
        `Provide it in the run context. Available: ${Object.keys(context).join(', ') || '(none)'}`
      );
    }
    return v;
  });
}

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Primitive 2: resolveArtifact
// ──────────────────────────────────────────────────────────────────────────

/**
 * Resolve a Quilt URI to a concrete artifact version. If the URI has no
 * version, resolves to the latest. If the URI contains `{{var}}` tokens,
 * substitutes them from the run context first.
 *
 * The `store` argument is optional — when omitted, only the URI is
 * normalized (no fetch). This is useful for planners that want to know
 * what would be fetched without actually fetching.
 *
 * @example
 *   await resolveArtifact("quilt://ml/datasets/staged:latest", {}, store)
 *   // → { uri: "quilt://ml/datasets/staged:latest", version: "v42", resolvedUri: "quilt://ml/datasets/staged:v42", ... }
 *
 *   await resolveArtifact("quilt://ml/models/classifier:{{run_id}}", { runId: "r-01" }, store)
 *   // → { resolvedUri: "quilt://ml/models/classifier:r-01", version: "r-01", ... }
 */
export async function resolveArtifact(
  uri: QuiltURI,
  context: RunContext = {},
  store?: ArtifactStore
): Promise<ResolvedArtifact> {
  // 1. Validate URI shape
  if (!uri.startsWith('quilt://') && !uri.startsWith('cell://')) {
    throw new ResolveError(
      `Invalid Quilt URI: "${uri}". Must start with "quilt://" or "cell://".`,
      uri
    );
  }

  // 2. Substitute template variables
  let templated: string;
  try {
    templated = resolveTemplate(uri, context);
  } catch (err) {
    if (err instanceof TemplateError) {
      throw new ResolveError(`Template substitution failed: ${err.message}`, uri);
    }
    throw err;
  }

  // 3. Parse logicalUri + version. Forms:
  //    quilt://bucket/name:version
  //    quilt://bucket/name      → :latest
  //    cell://sheet/cell.path   → no version (always live)
  const lastColon = templated.lastIndexOf(':');
  let logicalUri: string;
  let version: string;
  if (lastColon > templated.indexOf('//')) {
    // There's a version segment
    logicalUri = templated.slice(0, lastColon);
    version = templated.slice(lastColon + 1);
  } else {
    logicalUri = templated;
    version = 'latest';
  }

  if (version === 'latest' && store) {
    const versions = await store.listVersions(logicalUri);
    if (versions.length === 0) {
      throw new ResolveError(`No versions found for ${logicalUri}`, uri);
    }
    // Most recent first
    versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    version = versions[0].version;
  }

  const resolvedUri = `${logicalUri}:${version}`;

  // 4. If a store is given, fetch metadata
  let metadata: Record<string, unknown> = {};
  let provenance: ResolvedArtifact['provenance'] = { createdAt: new Date().toISOString() };
  if (store) {
    try {
      const result = await store.get(resolvedUri);
      metadata = result.metadata as Record<string, unknown>;
      const createdAtValue = result.metadata.createdAt;
      const createdAt = typeof createdAtValue === 'string' ? createdAtValue : new Date().toISOString();
      const originCommit = result.metadata.originCommit;
      const manifestIdValue = result.metadata.manifestId;
      provenance = {
        createdAt,
        originCommit: typeof originCommit === 'string' ? originCommit : undefined,
        manifestId: typeof manifestIdValue === 'string' ? manifestIdValue : undefined,
      };
    } catch (err) {
      // For latest→pinned, the resolved version may not be materialized
      // yet. That's OK — we return the resolved URI and let the caller
      // decide whether to fail.
      metadata = { _resolveWarning: `Could not fetch metadata: ${(err as Error).message}` };
    }
  }

  return {
    uri,
    version,
    resolvedUri,
    metadata,
    provenance,
  };
}

export class ResolveError extends Error {
  readonly uri: QuiltURI;
  constructor(message: string, uri: QuiltURI) {
    super(message);
    this.name = 'ResolveError';
    this.uri = uri;
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Primitive 3: validateManifest
// ──────────────────────────────────────────────────────────────────────────

/**
 * Validate a manifest against the Quilt manifest JSON schema, and
 * optionally check that all `artifact_exists` preconditions are met.
 *
 * Returns `{ valid: true, errors: [] }` on success, or
 * `{ valid: false, errors: [...] }` with one entry per failure.
 *
 * @example
 *   validateManifest(manifest)  // schema-only
 *   validateManifest(manifest, { store, checkExists: true })  // also verify preconditions
 */
export async function validateManifest(
  manifest: unknown,
  options: { store?: ArtifactStore; checkExists?: boolean; runContext?: RunContext } = {}
): Promise<ValidationResult> {
  // Lazy-load ajv so consumers that only use resolveTemplate don't pay
  // the cost. Use unknown casts because ajv is a CJS module whose types
  // don't perfectly fit the ESM-style default import.
  const AjvModule = await import('ajv');
  const AjvCtor = (AjvModule as unknown as { default: new (opts?: object) => unknown }).default;
  const addFormatsModule = await import('ajv-formats');
  const addFormats = (addFormatsModule as unknown as { default: (ajv: unknown) => void }).default;
  const schemaModule = await import('../../../schemas/manifest.schema.json', { with: { type: 'json' } });
  const schema = (schemaModule as unknown as { default: object }).default;
  type AjvInstance = {
    compile: (schema: object) => {
      (data: unknown): boolean;
      errors?: Array<{ instancePath: string; message?: string; keyword?: string }> | null;
    };
  };
  const ajv = new AjvCtor({ allErrors: true, strict: false }) as AjvInstance;
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  const errors: ValidationError[] = [];

  if (!valid) {
    for (const err of validate.errors ?? []) {
      errors.push({
        path: err.instancePath || '/',
        message: err.message ?? 'validation error',
        keyword: err.keyword,
      });
    }
    return { valid: false, errors };
  }

  // Precondition checks
  if (options.checkExists && options.store) {
    const m = manifest as { preconditions?: Array<{ type: string; uri?: string }> };
    for (const pre of m.preconditions ?? []) {
      if (pre.type === 'artifact_exists' && pre.uri) {
        try {
          const resolved = await resolveArtifact(pre.uri, options.runContext ?? {}, options.store);
          const exists = await options.store.exists(resolved.resolvedUri);
          if (!exists) {
            errors.push({
              path: `/preconditions/${pre.uri}`,
              message: `Precondition artifact_exists failed: ${resolved.resolvedUri} does not exist`,
              keyword: 'artifact_exists',
            });
          }
        } catch (err) {
          errors.push({
            path: `/preconditions/${pre.uri}`,
            message: `Precondition check failed: ${(err as Error).message}`,
            keyword: 'artifact_exists',
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ──────────────────────────────────────────────────────────────────────────
//  Primitive 4: publishArtifact
// ──────────────────────────────────────────────────────────────────────────

/**
 * Upload an artifact to the store and return its canonical Quilt URI.
 * The version is derived from the content hash (sha256) by default, or
 * from `metadata.version` if provided. This makes publishes content-
 * addressed and idempotent.
 *
 * @example
 *   const path = "trained_model.bin";
 *   const bytes = await readFile(path);
 *   const { uri, version } = await publishArtifact(bytes, {
 *     manifestId: "train-classifier",
 *     runId: "run-20260819-01",
 *     tags: ["model", "production"],
 *   }, store);
 *   // → uri: "quilt://artifacts/trained_model:abc123...", version: "abc123..."
 */
export async function publishArtifact(
  source: Uint8Array | string | { path: string },
  metadata: ArtifactMetadata,
  store: ArtifactStore
): Promise<{ uri: QuiltURI; version: string; contentHash: string }> {
  let bytes: Uint8Array;
  if (typeof source === 'string') {
    bytes = new TextEncoder().encode(source);
  } else if (source instanceof Uint8Array) {
    bytes = source;
  } else {
    // { path: string }
    const buf = await readFile(source.path);
    bytes = new Uint8Array(buf);
  }

  const contentHash = metadata.contentHash ?? hashBytes(bytes);

  // Logical URI: derive from metadata or generate a UUID
  const logicalName = (metadata.manifestId ?? 'artifact') + '/' + (metadata.runId ?? shortHash(bytes));
  const logicalUri = `quilt://artifacts/${logicalName}`;
  const version = metadata.version ?? contentHash.slice(0, 12);

  const enrichedMetadata: ArtifactMetadata = {
    ...metadata,
    contentHash,
    createdAt: metadata.createdAt ?? new Date().toISOString(),
  };

  const result = await store.put(logicalUri, bytes, enrichedMetadata);
  return {
    uri: result.uri,
    version: result.version,
    contentHash,
  };
}

function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function shortHash(bytes: Uint8Array): string {
  return hashBytes(bytes).slice(0, 8);
}

// ──────────────────────────────────────────────────────────────────────────
//  Primitive 5: publishRunTrace
// ──────────────────────────────────────────────────────────────────────────

/**
 * Persist a run_trace as an immutable Quilt artifact. Run traces are
 * always versioned by run_id so they can be replayed deterministically.
 *
 * The run_trace itself is the audit log: who ran what, when, with what
 * inputs, producing what outputs, and what happened at each node. It
 * is the single canonical record of an execution.
 *
 * @example
 *   await publishRunTrace({
 *     runId: "run-20260819-01",
 *     planId: "plan-abc",
 *     manifestId: "train-classifier",
 *     startTime: "2026-08-19T11:00:00Z",
 *     endTime:   "2026-08-19T11:42:13Z",
 *     status: "success",
 *     nodes: [
 *       { nodeId: "ingest",  status: "success", artifactUris: ["quilt://data/raw:v1"] },
 *       { nodeId: "train",   status: "success", artifactUris: ["quilt://models/classifier:abc123"] },
 *       { nodeId: "validate", status: "success" },
 *     ],
 *     provenance: { commit: "9f8a7b", plannerVersion: "1.0.0" },
 *   }, store);
 */
export async function publishRunTrace(
  trace: RunTrace,
  store: ArtifactStore
): Promise<{ uri: QuiltURI; version: string }> {
  if (!trace.runId) {
    throw new Error('RunTrace must have a runId');
  }
  if (!trace.nodes || trace.nodes.length === 0) {
    throw new Error('RunTrace must have at least one node');
  }

  const json = JSON.stringify(trace, null, 2);
  const bytes = new TextEncoder().encode(json);
  const contentHash = hashBytes(bytes);

  const metadata: ArtifactMetadata = {
    contentType: 'application/json',
    contentHash,
    manifestId: trace.manifestId,
    runId: trace.runId,
    tags: ['run-trace', ...(trace.replayHint?.tags ?? [])],
    createdAt: trace.startTime,
    ...trace.provenance,
  };

  const logicalUri = `quilt://runs/${trace.manifestId ?? 'unscoped'}/${trace.runId}`;
  const result = await store.put(logicalUri, bytes, { ...metadata, version: contentHash.slice(0, 12) });

  return {
    uri: result.uri,
    version: result.version,
  };
}

// ──────────────────────────────────────────────────────────────────────────
//  In-memory ArtifactStore (for tests and small demos)
// ──────────────────────────────────────────────────────────────────────────

/**
 * A minimal in-memory artifact store. Useful for tests, examples, and
 * browser-based demos where there is no real backend. Production
 * deployments should swap this for a Cloudflare R2 / S3 implementation.
 */
export class InMemoryArtifactStore implements ArtifactStore {
  private store = new Map<string, { bytes: Uint8Array; metadata: ArtifactMetadata }>();

  async put(logicalUri: QuiltURI, bytes: Uint8Array | string, metadata: ArtifactMetadata): Promise<{ uri: QuiltURI; version: string }> {
    const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
    const contentHash = metadata.contentHash ?? hashBytes(data);
    const version = metadata.version ?? contentHash.slice(0, 12);
    const fullUri = `${logicalUri}:${version}`;
    this.store.set(fullUri, { bytes: data, metadata: { ...metadata, contentHash, createdAt: metadata.createdAt ?? new Date().toISOString() } });
    return { uri: fullUri, version };
  }

  async get(uri: QuiltURI): Promise<{ bytes: Uint8Array; metadata: ArtifactMetadata }> {
    const entry = this.store.get(uri);
    if (!entry) throw new Error(`Artifact not found: ${uri}`);
    return entry;
  }

  async exists(uri: QuiltURI): Promise<boolean> {
    return this.store.has(uri);
  }

  async listVersions(logicalUri: QuiltURI): Promise<{ version: string; createdAt: string }[]> {
    const out: { version: string; createdAt: string }[] = [];
    const prefix = logicalUri + ':';
    for (const [uri, entry] of this.store) {
      if (uri.startsWith(prefix)) {
        const version = uri.slice(prefix.length);
        const createdAt = entry.metadata.createdAt;
        out.push({ version, createdAt: typeof createdAt === 'string' ? createdAt : '' });
      }
    }
    return out;
  }

  /** Inspect everything (for debugging). */
  entries(): Array<[string, ArtifactMetadata]> {
    return Array.from(this.store.entries()).map(([uri, e]) => [uri, e.metadata]);
  }
}
