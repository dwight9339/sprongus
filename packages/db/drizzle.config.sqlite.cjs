"use strict";

const { defineConfig } = require("drizzle-kit");
const path = require("node:path");

module.exports = defineConfig({
  dialect: "sqlite",
  schema: path.resolve(__dirname, "./src/schema/sqlite/index.ts"),
  out: path.resolve(__dirname, "./drizzle/sqlite"),
  dbCredentials: {
    url: process.env.SPRONGUS_DB_PATH ?? ":memory:",
  },
});
