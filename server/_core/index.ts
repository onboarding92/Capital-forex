import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { upload } from "../upload";
import path from "path";
import { WebSocketServer } from "ws";
import { initWebSocketServer } from "../websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Configure cookie parser
  app.use(cookieParser());
  
  // API logging middleware
  const { apiLoggingMiddleware } = await import("../middleware/apiLogger");
  app.use(apiLoggingMiddleware);
  // Serve uploads folder as static files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // File upload endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Trading Bot REST API
  const tradingBotAPI = (await import("../tradingBotAPI")).default;
  app.use("/api/v1/trading", tradingBotAPI);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server, path: "/ws" });
  initWebSocketServer(wss);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket server running on ws://localhost:${port}/ws`);
    
    // Start alerting system
    import("../alerting").then(({ startAlertingSystem }) => {
      startAlertingSystem();
    }).catch(console.error);
    
    // Start matching engine
    import("../matchingEngineJob").then(({ startMatchingEngine }) => {
      startMatchingEngine();
    }).catch(console.error);
    
    // Start price feed broadcaster
    import("../priceFeedJob").then(({ startPriceFeedBroadcaster }) => {
      startPriceFeedBroadcaster();
    }).catch(console.error);
    
    // Start liquidation engine
    import("../liquidationEngine").then(({ startLiquidationEngine }) => {
      startLiquidationEngine();
    }).catch(console.error);
    
    // Start funding rate job
    import("../fundingRateJob").then(({ startFundingRateJob }) => {
      startFundingRateJob();
    }).catch(console.error);
    

  });
}

startServer().catch(console.error);
