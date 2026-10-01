// CloudLinux / cPanel LVE — keep process + thread count minimal (before any require).
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || "1";
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || "--max-old-space-size=384";
process.env.NEXT_PRIVATE_WORKER_THREADS = process.env.NEXT_PRIVATE_WORKER_THREADS || "0";
process.env.DATABASE_POOL_SIZE = process.env.DATABASE_POOL_SIZE || "2";

const http = require("http");
const { parse } = require("url");
const next = require("next");

// Without these, a crash silently kills the worker and Passenger just respawns
// it — indistinguishable from unexplained lsnode churn. Log before it happens.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  if (typeof PhusionPassenger !== "undefined") {
    PhusionPassenger.configure({
      autoInstall: false,
      maxPoolSize: 1,
      minInstances: 1,
    });
    server.listen("passenger");
  } else {
    server.listen(process.env.PORT || 3000);
  }
});
