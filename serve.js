// Minimal static server for the Godot web export.
// Usage: node serve.js <dir> [port]
// Correct MIME for .wasm/.pck + optional cross-origin isolation for threaded builds.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || ".");
const PORT = parseInt(process.argv[3] || "8099", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ogv": "video/ogg",
  ".mp3": "audio/mpeg",
  ".side.wasm": "application/wasm",
};

function baseHeaders(filePath, size) {
  return {
    "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Length": size,
  };
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }
      const range = req.headers.range;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (!Number.isFinite(start) || start < 0) start = 0;
        if (!Number.isFinite(end) || end >= st.size) end = st.size - 1;
        const headers = baseHeaders(filePath, end - start + 1);
        headers["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
        res.writeHead(206, headers);
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, baseHeaders(filePath, st.size));
        fs.createReadStream(filePath).pipe(res);
      }
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Serving ${ROOT} on http://127.0.0.1:${PORT}/feedthepit.html`);
  });
