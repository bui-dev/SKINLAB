# Authentication foundation

This vendor-neutral module defines session types and server/client stubs only. It does not persist credentials or implement login.

Next.js 16 uses `src/proxy.ts` instead of the deprecated root `middleware.ts` convention. Add a proxy only after an authentication vendor and route policy are chosen; proxy checks must never replace authorization inside server actions or route handlers.
