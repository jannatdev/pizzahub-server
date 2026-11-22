import "dotenv/config";


import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { z } from "zod";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env");
}

const client = new MongoClient(uri);

await client.connect();

console.log("Better Auth MongoDB connected successfully!");

const db = client.db("pizza-hub");

export type UserRole = "customer" | "vendor" | "admin";

/**
 * Origins allowed to call Better Auth. Anything else is rejected with 403
 * INVALID_ORIGIN, so both loopback spellings of the dev server are listed —
 * opening the site as 127.0.0.1:3000 must not make sign-in/sign-up fail.
 */
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),

  // baseURL: process.env.BETTER_AUTH_URL,

  // secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [...new Set(allowedOrigins)],

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: true,
        validator: {
          input: z.enum(["customer", "vendor", "admin"]),
        },
      },
    },
  },

  /**
   * Storage-layer guarantees for `role` (defense in depth):
   * - On create: any value that is not "customer"/"vendor" is forced to
   *   "customer" — covers sign-up, OAuth and any future user-creation path.
   *   "admin" is also permitted by the validator but the public sign-up form
   *   only ever selects "customer" or "vendor", so admin accounts cannot be
   *   created through registration. The role must be assigned through a secure,
   *   non-public pathway (e.g. by an existing admin).
   * - On update: a payload containing `role` aborts the update — the role is
   *   chosen at sign-up and can never be changed afterwards.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.role !== "customer" && user.role !== "vendor") {
            return {
              data: {
                role: "customer",
              },
            };
          }
        },
      },

      update: {
        before: async (data) => {
          if ("role" in data) {
            return false;
          }
        },
      },
    },
  },
});