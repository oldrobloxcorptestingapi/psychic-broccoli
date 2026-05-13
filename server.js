import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import http from "node:http";
import cors from "cors";

const bare = createBareServer("/bare/");
const app = express();

// Allow all origins for cross-origin proxy requests
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["*"],
  })
);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "UV Bare Server",
    version: "2.0",
    endpoints: { bare: "/bare/" },
  });
});

// Route all requests through the bare server handler
app.use((req, res, next) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = http.createServer(app);

// Handle WebSocket upgrades (needed for proxying WS connections in target sites)
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Bare server running on http://localhost:${PORT}`);
  console.log(`   Bare endpoint: http://localhost:${PORT}/bare/`);
});

// Vercel serverless export
export default app;
