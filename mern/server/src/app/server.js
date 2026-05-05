import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import connectToDatabase, {
  getDatabaseName,
  isDatabaseReady,
} from "../shared/config/db.js";
import errorHandler from "../shared/middleware/errorHandler.js";
import sanitizeRequest from "../shared/middleware/sanitizeRequest.js";
import standardizeErrorResponses from "../shared/middleware/standardizeErrorResponses.js";
import authRoutes from "../modules/auth/auth.routes.js";
import attendanceRoutes from "../modules/attendance/attendance.routes.js";
import branchRoutes from "../modules/branches/branch.routes.js";
import buscellRoutes from "../modules/buscells/buscell.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import ecclesiaRoutes from "../modules/ecclesias/ecclesia.routes.js";
import exportRoutes from "../modules/exports/export.routes.js";
import financeRoutes from "../modules/finance/finance.routes.js";
import memberRoutes from "../modules/members/member.routes.js";
import recordRoutes from "../modules/records/record.routes.js";
import recordWeekRoutes from "../modules/records/recordWeek.routes.js";
import reportRoutes from "../modules/reports/report.routes.js";
import testRoutes from "../modules/diagnostics/test.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import { getAllowedClientOrigins, validateServerEnv } from "../shared/utils/env.js";
import createHttpError from "../shared/utils/httpError.js";
import logger from "../shared/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../config.env") });
validateServerEnv();

const app = express();
const port = Number(process.env.PORT) || 5050;
const allowedOrigins = new Set(getAllowedClientOrigins());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        createHttpError(403, "This origin is not allowed by CORS policy.", "CORS_ORIGIN_DENIED")
      );
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeRequest);
app.use(standardizeErrorResponses);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: isDatabaseReady() ? "ok" : "starting",
    database: getDatabaseName(),
    service: "lcc-auth-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/ecclesias", ecclesiaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/buscells", buscellRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/record-weeks", recordWeekRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/test", testRoutes);

app.use((_req, _res, next) => {
  next(createHttpError(404, "Route not found.", "ROUTE_NOT_FOUND"));
});

app.use(errorHandler);

try {
  await connectToDatabase();

  app.listen(port, () => {
    logger.info("Server listening", {
      port,
      database: getDatabaseName(),
    });
  });
} catch (error) {
  logger.error("Failed to start the server", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
}
