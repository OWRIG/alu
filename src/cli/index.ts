#!/usr/bin/env node

import { runCli } from "./run";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

const result = await runCli(process.argv.slice(2), { readStdin });
process.stdout.write(`${JSON.stringify(result.response)}\n`);
process.exitCode = result.exitCode;
