export const ENV = {
  appId: process.env.VITE_APP_ID ?? "standalone",
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "http://localhost:3000",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "admin",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "http://localhost:3000",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "standalone",
};
