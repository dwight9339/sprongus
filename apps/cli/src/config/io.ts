import fs from "node:fs/promises";

export async function readFileText(path: string): Promise<string> {
  return fs.readFile(path, "utf8");
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  const stream = process.stdin as AsyncIterable<string | Buffer>;
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk, "utf8"));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}
