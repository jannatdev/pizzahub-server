
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

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),

  // baseURL: process.env.BETTER_AUTH_URL,

  // secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:3000",
  ],

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
          input: z.enum(["customer", "vendor"]),
        },
      },
    },
  },

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
