import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/timeline(.*)',
  '/add(.*)',
  '/edit(.*)',
  '/groups(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/setup(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // If user is authenticated but accessing protected routes, 
  // check if they have a group (do this on the frontend for now)
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};