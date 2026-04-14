import { auth } from "./auth";

const authMiddleware = auth((req) => {
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthUser = !!req.auth;

  if (isLoginPage) {
    if (isAuthUser) {
      return Response.redirect(new URL("/", req.url));
    }

    return null;
  }

  if (!isAuthUser) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export default function middleware(req) {
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const hasTestAuthBypass =
    process.env.PLAYWRIGHT_TEST_AUTH_BYPASS === "1" &&
    req.cookies.get("e2e-auth")?.value === "1";

  if (hasTestAuthBypass) {
    if (isLoginPage) {
      return Response.redirect(new URL("/", req.url));
    }

    return null;
  }

  return authMiddleware(req);
}

export const config = {
  matcher: ["/", "/editor/:path*", "/subscription/:path*", "/login"],
};
