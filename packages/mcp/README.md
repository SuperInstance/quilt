# @superinstance/quilt-mcp

> MCP bindings for Quilt — serve a Quilt sheet to MCP clients (Claude
> Code and friends) over stdio: read cells, write cells, and inspect
> sheets as tools.

```bash
npm install @superinstance/quilt-mcp
```

This package is a library. It wraps a `QuiltEngine` from
`@superinstance/quilt-core` in an MCP server using
`@modelcontextprotocol/sdk`:

```ts
import { QuiltEngine } from '@superinstance/quilt-core';
import { startMcpServer } from '@superinstance/quilt-mcp';

const engine = new QuiltEngine('my-sheet');
engine.loadSheet({ id: 'my-sheet', cells: [/* … */] });

await startMcpServer(engine); // stdio transport; serves until the client disconnects
```

`createMcpServer(engine, options)` is also exported if you need the
server object without connecting a transport.

Full documentation lives in the main repository:
https://github.com/SuperInstance/quilt

License: Apache-2.0
