"use client";

import { SessionProvider } from "next-auth/react";

function NextAuthProvider({ children }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}

export default NextAuthProvider;
