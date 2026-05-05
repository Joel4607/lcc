const DEFAULT_ALLOWED_CLIENTS = ["http://localhost:5173"];

export function getEnv(name, fallback = undefined) {
  const value = process.env[name];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

export function getRequiredEnv(name) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function validateServerEnv() {
  getRequiredEnv("JWT_SECRET");

  if (!getEnv("MONGODB_URI") && !getEnv("ATLAS_URI")) {
    throw new Error("Missing MongoDB connection string. Set MONGODB_URI or ATLAS_URI.");
  }
}

export function getAllowedClientOrigins() {
  const configured = getEnv("CLIENT_URL", "");

  if (!configured) {
    return DEFAULT_ALLOWED_CLIENTS;
  }

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
