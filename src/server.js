import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(currentDirectory, "..");
const credentialsPath = process.env.ATLAS_ENV_FILE
  ? path.resolve(process.env.ATLAS_ENV_FILE)
  : path.join(backendDirectory, "atlas-credentials.env");

const credentials = dotenv.config({ path: credentialsPath });
if (credentials.error && credentials.error.code !== "ENOENT") {
  console.error("Could not load the configured environment file.");
  process.exit(1);
}
dotenv.config({ path: path.join(backendDirectory, ".env") });

const { default: app } = await import("./app.js");
const { connectDatabase } = await import("./config/database.js");

const port = Number(process.env.PORT) || 5000;

try {
  await connectDatabase();
  const server = app.listen(port, () => {
    console.log(`LearnEnglish API listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch {
  console.error("MongoDB connection failed. Check MONGODB_URI in the Atlas env file.");
  process.exit(1);
}