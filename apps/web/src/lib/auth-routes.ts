export interface RouteDecision {
  /** Where to send the visitor, or null to let the request through. */
  redirectTo: "/login" | "/admin" | null;
}

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Decides what to do with a request, given whether the visitor is signed in. */
export function routeDecision(pathname: string, isSignedIn: boolean): RouteDecision {
  if (isUnder(pathname, "/admin") && !isSignedIn) {
    return { redirectTo: "/login" };
  }
  if (pathname === "/login" && isSignedIn) {
    return { redirectTo: "/admin" };
  }
  return { redirectTo: null };
}
