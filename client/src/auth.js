import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshGoogleIdToken(token) {
  if (!token.refreshToken) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.AUTH_GOOGLE_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      idToken: refreshedTokens.id_token || token.idToken,
      accessToken: refreshedTokens.access_token || token.accessToken,
      refreshToken: refreshedTokens.refresh_token || token.refreshToken,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing Google token", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const { handlers, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token || token.refreshToken;
        token.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 55 * 60 * 1000;
      }

      if (token.expiresAt && Date.now() > token.expiresAt - 60 * 1000) {
        return refreshGoogleIdToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.idToken = token.idToken;
      session.error = token.error;
      return session;
    },
  },
});
