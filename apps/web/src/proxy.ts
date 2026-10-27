import { NextResponse, type NextRequest } from "next/server";
import { routeDecision } from "@/lib/auth-routes";
import { checkSession } from "@/server/supabase/session";

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await checkSession(request);
  const { redirectTo } = routeDecision(request.nextUrl.pathname, isSignedIn);
  if (redirectTo === null) {
    return response;
  }

  const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
