
import type { Request, Response, NextFunction } from "express";

import { auth } from "../lib/auth.ts";
/** The authenticated user attached to `req.user` by `attachSession`. */
export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

/** `Request` with the resolved session user (undefined when signed out). */
export type AuthedRequest = Request & { user?: AuthUser };

/**
 * Builds a web `Headers` object from Node's `req.headers`.
 * Node allows `string[]` header values, which `Headers` rejects, so multi-value
 * headers are appended one by one.
 */
function toWebHeaders(nodeHeaders: Request["headers"]): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.append(key, value);
    }
  }

  return headers;
}



export const attachSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
     const session = await auth.api.getSession({
      headers: toWebHeaders(req.headers),
    });

   const user = session?.user as
      | (AuthUser & { id?: string; email?: string; name?: string })
      | undefined;

    if (user) {
      (req as AuthedRequest).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }
  } catch (error) {
    console.error("Could not read auth session:", error);
  }

  return next();
};

/**
 * Gate that requires a signed-in user.
 *
 * Runs `attachSession` first, then rejects with 401 when no session was
 * attached. Controllers still receive `req.user` for role/ownership checks.
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  attachSession(req, res, (err?: unknown) => {
    if (err) return next(err);

    if (!(req as AuthedRequest).user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    return next();
  });
};
