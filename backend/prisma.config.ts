import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

config({
  path: path.join(process.cwd(), ".env"),
  override: true,
});

export default defineConfig({
  schema: "./prisma/schema.prisma",
});
