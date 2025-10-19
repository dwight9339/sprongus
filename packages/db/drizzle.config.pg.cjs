"use strict";

const { defineConfig } = require("drizzle-kit");
const path = require("node:path");

module.exports = defineConfig({
  dialect: "postgresql",
  schema: path.resolve(__dirname, "./src/schema/pg/index.ts"),
  out: path.resolve(__dirname, "./drizzle/pg"),
  dbCredentials: {
    url:
      process.env.SPRONGUS_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/postgres",
  },
});
