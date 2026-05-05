import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { getEnv } from "../utils/env.js";

function getConnectionString() {
  return getEnv("MONGODB_URI") || getEnv("ATLAS_URI") || "";
}

export function getDatabaseName() {
  return getEnv("DB_NAME", "lccdata");
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export default async function connectToDatabase() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error(
      "Missing MongoDB connection string. Set ATLAS_URI or MONGODB_URI in mern/server/config.env."
    );
  }

  if (isDatabaseReady()) {
    return mongoose.connection;
  }

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", {
      message: error.message,
      stack: error.stack,
    });
  });

  await mongoose.connect(connectionString, {
    dbName: getDatabaseName(),
  });

  logger.info("Connected to MongoDB", {
    database: mongoose.connection.name,
  });

  return mongoose.connection;
}
