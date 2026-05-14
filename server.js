import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import http from "node:http";
import cors from "cors";

const bare = createBareServer("/bare/");
const app = express();

// CORS - allow all origins
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
  allowedHeaders: ["*"],
  exposedHeaders: ["*"],
  credentials: true,
}));

// Strip headers that break CAPTCHA / iframe loading
app.use((req, res, next) => {
  // Remove restrictive headers from responses so CAPTCHAs can load in iframes
  const origSetHeader = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    const lower = name.toLowerCase();
    // Block headers that prevent CAPTCHA iframes from rendering
    if (lower === "x-frame-options") return;
    if (lower === "content-security-policy") return;
    if (lower === "cross-origin-embedder-policy") return;
    if (lower === "cross-origin-opener-policy") return;
    if (lower === "cross-origin-resource-policy") return;
    origSetHeader(name, value);
  };
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "UV Bare Server",
    version: "2.0",
    endpoints: { bare: "/bare/" },
    captcha: "passthrough enabled",
  });
});

// Route bare protocol requests
app.use((req, res, next) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = http.createServer(app);

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
});

export default app;
