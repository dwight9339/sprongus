#!/usr/bin/env node
import {execute, flush} from "@oclif/core";

// Entrypoint for the CLI (ESM). oclif scans commands per package.json.
await execute({development: false, dir: import.meta.url});
await flush();
