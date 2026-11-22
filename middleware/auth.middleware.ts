
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

// --------------------------------------
// 1. Types
// --------------------------------------

export type UserRole = "admin" | "vendor" | "customer";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
};

export type AuthedRequest = Request & {
  user?: AuthUser;
};

// --------------------------------------
// 2. Better Auth JWT configuration
// --------------------------------------

const AUTH_URL = process.env.BETTER_AUTH_URL;

if (!AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is missing.");
}

const AUTH_ISSUER = AUTH_URL.replace(/\/$/, "");

const AUTH_AUDIENCE =
  process.env.BETTER_AUTH_AUDIENCE || AUTH_ISSUER;

// Create JWKS once and reuse it.
// jose automatically caches remote public keys.
const JWKS = createRemoteJWKSet(
  new URL(`${AUTH_ISSUER}/api/auth/jwks`)
);

// --------------------------------------
// 3. Verify JWT middleware
// --------------------------------------

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Missing token
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    // Validate Bearer format
    const [scheme, token, ...extra] = authHeader.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token ||
      extra.length > 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
    }

    // Verify signature, expiration, issuer and audience
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
    });

    // JWT must have a subject (user ID)
    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Validate role
    const allowedRoles: UserRole[] = [
      "admin",
      "vendor",
      "customer",
    ];

    if (
      !payload.role ||
      !allowedRoles.includes(payload.role as UserRole)
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid or unauthorized user role.",
      });
    }

    // Attach verified identity to request
    (req as AuthedRequest).user = {
      id: payload.sub,
      email: typeof payload.email === "string"
        ? payload.email
        : "",
      name: typeof payload.name === "string"
        ? payload.name
        : undefined,
      role: payload.role as UserRole,
    };

    return next();

  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// --------------------------------------
// 4. Role-based middleware
// --------------------------------------

export const authorizeRoles = (
  ...roles: UserRole[]
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = (req as AuthedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
};

// --------------------------------------
// 5. Backward-compatible middleware name
// --------------------------------------

export const requireAuth = authenticate;
