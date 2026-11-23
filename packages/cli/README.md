# @superinstance/quilt-cli

> The Quilt command line — run, inspect, and poke Quilt sheets from a
> terminal.

```bash
npm install -g @superinstance/quilt-cli
```

Commands (each takes a sheet file):

```
quilt run <sheet>                  evaluate a sheet
quilt serve <sheet> [--mcp]        serve it (optionally as an MCP server)
quilt get <sheet> <cell>           read one cell
quilt set <sheet> <cell> <value>   write one cell
quilt inspect <sheet>              show the sheet's structure
quilt test <sheet>                 run a sheet's tests
quilt validate <file>              validate a sheet file
```

Full documentation lives in the main repository:
https://github.com/SuperInstance/quilt

License: Apache-2.0
