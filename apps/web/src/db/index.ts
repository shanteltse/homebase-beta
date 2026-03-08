import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@placeholder/placeholder";

const sql = postgres(connectionString, { ssl: "require" });

export const db = drizzle(sql, { schema });
