#!/usr/bin/env node
import { spawn } from "node:child_process";
import net from "node:net";

const DEFAULT_PORT = Number.parseInt(
  process.env.SPRONGUS_TEST_PG_PORT ?? "5432",
  10,
);
const DEFAULT_USER = process.env.SPRONGUS_TEST_PG_USER ?? "postgres";
const DEFAULT_PASSWORD =
  process.env.SPRONGUS_TEST_PG_PASSWORD ?? "postgres";
const DEFAULT_DATABASE =
  process.env.SPRONGUS_TEST_PG_DATABASE ?? "sprongus";

const preferredHosts = (process.env.SPRONGUS_TEST_PG_HOSTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const fallbackHosts = [
  "localhost",
  "127.0.0.1",
  "172.17.0.1",
  "172.18.0.1",
  "172.21.0.1",
  "host.docker.internal",
  "docker.host.internal",
  "postgres",
  "sprongus-postgres",
];

const candidateHosts = [
  ...new Set([...preferredHosts, ...fallbackHosts]),
];

function canReachHost(host, port, timeoutMs = 750) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const cleanup = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.once("connect", () => cleanup(true));
    socket.once("error", () => cleanup(false));
    socket.setTimeout(timeoutMs, () => cleanup(false));
  });
}

async function resolveConnectionString() {
  if (process.env.SPRONGUS_TEST_PG_URL) {
    return process.env.SPRONGUS_TEST_PG_URL;
  }

  for (const host of candidateHosts) {
    // eslint-disable-next-line no-await-in-loop
    const reachable = await canReachHost(host, DEFAULT_PORT);
    if (reachable) {
      return `postgres://${DEFAULT_USER}:${DEFAULT_PASSWORD}@${host}:${DEFAULT_PORT}/${DEFAULT_DATABASE}`;
    }
  }

  return null;
}

async function main() {
  const connectionString = await resolveConnectionString();
  if (!connectionString) {
    console.error(
      [
        "Unable to reach a Postgres instance for tests.",
        "Tried hosts:",
        candidateHosts.map((host) => `  - ${host}`).join("\n"),
        "Provide SPRONGUS_TEST_PG_URL or SPRONGUS_TEST_PG_HOSTS to configure the connection.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const args = ["exec", "vitest", "run", ...process.argv.slice(2)];
  const child = spawn("pnpm", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      SPRONGUS_TEST_PG_URL: connectionString,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error("Failed to launch vitest:", error);
    process.exitCode = 1;
  });
}

main().catch((error) => {
  console.error("Unexpected error running tests:", error);
  process.exitCode = 1;
});
