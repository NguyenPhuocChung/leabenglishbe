import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stdin, stdout } from "node:process";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(scriptDirectory, "../..");
dotenv.config({ path: path.join(backendDirectory, "atlas-credentials.env") });
dotenv.config({ path: path.join(backendDirectory, ".env") });

async function promptForPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Set ADMIN_PASSWORD in .env when running without an interactive terminal.");
  }

  stdout.write("Admin password (12+ characters, input hidden): ");
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };

    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Admin setup cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
          continue;
        }
        if (character >= " ") password += character;
      }
    };

    stdin.on("data", onData);
  });
}

const prompts = createInterface({ input: stdin, output: stdout });
const name = process.env.ADMIN_NAME?.trim() || (await prompts.question("Admin name: ")).trim();
const email = (process.env.ADMIN_EMAIL || (await prompts.question("Admin email: "))).trim().toLowerCase();
prompts.close();
const password = process.env.ADMIN_PASSWORD || await promptForPassword();

const { connectDatabase } = await import("../config/database.js");
const { default: User } = await import("../models/User.js");

if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
  console.error("Admin name, a valid email, and a password of at least 12 characters are required.");
  process.exit(1);
}

try {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role: "admin", status: "active" },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log("Admin account created or updated.");
} catch {
  console.error("Admin account setup failed. Check the Atlas connection and admin environment values.");
  process.exitCode = 1;
} finally {
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
}