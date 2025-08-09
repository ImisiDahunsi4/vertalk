export const envConfig = {
  vapi: {
    apiUrl: process.env.NEXT_PUBLIC_VAPI_API_URL ?? "https://api.vapi.ai",
    token: process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ?? "b36ed366-fd36-4a28-bb95-ec92dc87fe47",
  },
};
