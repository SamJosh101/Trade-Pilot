import dotenv from "dotenv";
import {assertProductionSecurity} from '../security/config';
import {assertStagingConfig} from '../security/stagingGate';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  stagingEnabled: process.env.TRADEPILOT_STAGING === 'true',
  stagingAccessKey: process.env.TRADEPILOT_STAGING_ACCESS_KEY,
  authSecurityRequired: process.env.TRADEPILOT_AUTH_SECURITY_REQUIRED === 'true',
  financialWritesEnabled: process.env.TRADEPILOT_FINANCIAL_WRITES === "true" && ["development","test"].includes(process.env.NODE_ENV || "development"),
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
assertProductionSecurity(env.nodeEnv,env.jwtSecret,env.corsOrigin);
assertStagingConfig(env);
