import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import http from "node:http";
import cors from "cors";

const bare = createBareServer("/bare/");
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
  allowedHeaders: ["*"],
  exposedHeaders: ["*"],
  credentials: true,
}));

// Remove headers that block challenge pages / iframes from rendering
app.use((req, res, next) => {
  const orig = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    const n = name.toLowerCase();
    if (n === "x-frame-options")               return; // blocks iframes
    if (n === "content-security-policy")       return; // blocks inline scripts
    if (n === "cross-origin-embedder-policy")  return; // breaks challenge workers
    if (n === "cross-origin-opener-policy")    return; // breaks popups
    if (n === "cross-origin-resource-policy")  return; // blocks cross-origin loads
    orig(name, value);
  };
  next();
});

app.get("/", (_req, res) => res.json({
  status: "ok", service: "UV Bare Server", version: "2.0",
}));

app.use((req, res, next) => {
  if (bare.shouldRoute(req)) bare.routeRequest(req, res);
  else next();
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
  else socket.destroy();
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Bare server → http://localhost:${PORT}`));
export default app;
