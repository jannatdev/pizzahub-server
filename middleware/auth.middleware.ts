
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

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

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
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Check whether token exists
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
      return;
    }

    // Validate Bearer format
    const [scheme, token, ...extra] = authHeader.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token ||
      extra.length > 0
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
      return;
    }

    // Verify JWT signature, expiration, issuer and audience
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
    });

    // Validate user ID
    if (!payload.sub) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    // Allowed roles
    const allowedRoles: UserRole[] = [
      "admin",
      "vendor",
      "customer",
    ];

    // Validate JWT role
    if (
      typeof payload.role !== "string" ||
      !allowedRoles.includes(payload.role as UserRole)
    ) {
      res.status(403).json({
        success: false,
        message: "Invalid or unauthorized user role.",
      });
      return;
    }

    // Attach verified identity to request
    const authedReq = req as AuthedRequest;

    authedReq.user = {
      id: payload.sub,
      email:
        typeof payload.email === "string"
          ? payload.email
          : undefined,
      name:
        typeof payload.name === "string"
          ? payload.name
          : undefined,
      role: payload.role as UserRole,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// --------------------------------------
// 4. Role-based authorization middleware
// --------------------------------------

export const authorizeRoles = (
  ...roles: UserRole[]
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    if (!user.role || !roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
};

// --------------------------------------
// 5. Backward-compatible middleware names
// --------------------------------------

export const requireAuth = authenticate;
export const authMiddleware = authenticate;
