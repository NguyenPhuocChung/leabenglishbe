import mongoose from "mongoose";

export function getHealth(request, response) {
  response.json({
    success: true,
    data: {
      api: "up",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
}