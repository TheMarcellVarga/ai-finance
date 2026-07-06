import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { hasClerkRuntimeKeys } from "@/lib/clerk-config";

const isWorkspaceRoute = createRouteMatcher(["/app(.*)"]);

const proxy = hasClerkRuntimeKeys()
  ? clerkMiddleware(async (auth, request) => {
      if (isWorkspaceRoute(request)) {
        await auth.protect();
      }
    })
  : function proxy(request: NextRequest) {
      if (isWorkspaceRoute(request)) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }

      return NextResponse.next();
    };

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
