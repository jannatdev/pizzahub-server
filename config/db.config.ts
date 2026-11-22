// Central MongoDB connection + the shared collections every route uses.
//
// One import = one shared connection (ESM modules are singletons), so
// index.js and all route/controller files work with the same client.
import { MongoClient } from "mongodb";
import type { Db } from "mongodb";
import "dotenv/config";

const DB_NAME = "pizza-hub";

// Collections every feature ("item") of the app works with.
// NOTE: user accounts are NOT in this list — Better Auth owns authentication and
// writes every user to the "user" collection (see the `users` export below).
const COLLECTIONS = ["menus", "orders"];

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI. Add it to your .env file.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

async function ensureCollections(database: Db) {
  for (const name of COLLECTIONS) {
    try {
      await database.createCollection(name);
      console.log(`Created collection "${name}" in "${DB_NAME}"`);
    } catch (err) {
      // 48 / NamespaceExists -> collection is already there, nothing to do.
      const error = err as { code?: number; codeName?: string; message?: string };
      if (error.code === 48 || error.codeName === "NamespaceExists") continue;
      console.warn(`Could not create collection "${name}":`, error.message);
    }
  }
}

try {
  await client.connect();
  console.log("You successfully connected to MongoDB!");
} catch (err) {
  console.error(
    "MongoDB connection failed:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
}

export const db = client.db(DB_NAME);
await ensureCollections(db);

// Shared collections — import these from route/controller files.

// IMPORTANT: Better Auth stores accounts in the collection named "user"
// (singular). The legacy "users" collection stays empty, so anything that
// reads user data (vendor lookups, role checks, admin lists) must use this
// export — otherwise queries return nothing even when the user exists.
// (Five controllers and the payment route import it — it must stay exported
// or the whole server fails to boot with "does not provide an export named
// 'users'".)
export const users = db.collection("user");
export const menus = db.collection("menus");
export const orders = db.collection("orders");
// Payment records (Stripe checkout verification + the admin transactions
// list). Renamed from `payments`; the two importers use this name too.
export const transactions = db.collection("transactions");

