#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = path.resolve(process.env.REPORT_ROOT || process.cwd());
const dataPath = path.resolve(process.env.COMMENT_DB || path.join(rootDir, "comments-db.json"));
const port = Number(process.env.PORT || 8787);

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers,
  });
  response.end(body);
}

function sendJson(response, status, value) {
  send(response, status, JSON.stringify(value), { "Content-Type": "application/json; charset=utf-8" });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function loadStore() {
  if (!fs.existsSync(dataPath)) return { comments: [] };
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    return { comments: Array.isArray(data.comments) ? data.comments : [] };
  } catch {
    return { comments: [] };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  const tempPath = `${dataPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempPath, dataPath);
}

function cleanComment(value) {
  const now = new Date().toISOString();
  const text = String(value.text || "").trim().slice(0, 4000);
  const doc = String(value.doc || value.docId || "").trim().slice(0, 160);
  if (!doc) throw new Error("missing doc");
  if (!text) throw new Error("missing text");
  return {
    id: String(value.id || `c_${crypto.randomUUID()}`),
    doc,
    selector: String(value.selector || "").slice(0, 1000),
    anchorText: String(value.anchorText || value.textSnippet || "").slice(0, 300),
    xRatio: Number.isFinite(Number(value.xRatio)) ? Number(value.xRatio) : 0.5,
    yRatio: Number.isFinite(Number(value.yRatio)) ? Number(value.yRatio) : 0.2,
    pageX: Number.isFinite(Number(value.pageX)) ? Number(value.pageX) : 0,
    pageY: Number.isFinite(Number(value.pageY)) ? Number(value.pageY) : 0,
    text,
    locale: String(value.locale || "").slice(0, 32),
    createdAt: value.createdAt || now,
    updatedAt: now,
  };
}

function safeStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath === "/" ? "/Global_GnG_2026May_FGD_Report_CN.html" : requestPath);
  const resolved = path.resolve(rootDir, `.${decoded}`);
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) return null;
  if (resolved === dataPath || resolved.includes(`${path.sep}.git${path.sep}`)) return null;
  return resolved;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function handleApi(request, response, url) {
  const store = loadStore();

  if (request.method === "GET" && url.pathname === "/api/comments") {
    const doc = String(url.searchParams.get("doc") || "");
    sendJson(response, 200, store.comments.filter((comment) => comment.doc === doc));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/comments") {
    const comment = cleanComment(await readJsonBody(request));
    store.comments.push(comment);
    saveStore(store);
    sendJson(response, 201, comment);
    return;
  }

  const match = url.pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (!match) {
    sendJson(response, 404, { error: "not found" });
    return;
  }

  const id = decodeURIComponent(match[1]);
  const index = store.comments.findIndex((comment) => comment.id === id);

  if (request.method === "PUT") {
    if (index < 0) {
      sendJson(response, 404, { error: "comment not found" });
      return;
    }
    const updated = cleanComment({ ...store.comments[index], ...(await readJsonBody(request)), id });
    store.comments[index] = updated;
    saveStore(store);
    sendJson(response, 200, updated);
    return;
  }

  if (request.method === "DELETE") {
    if (index >= 0) {
      store.comments.splice(index, 1);
      saveStore(store);
    }
    send(response, 204, "");
    return;
  }

  sendJson(response, 405, { error: "method not allowed" });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, "");
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/comments")) {
      await handleApi(request, response, url);
      return;
    }

    if (request.method !== "GET") {
      send(response, 405, "Method not allowed");
      return;
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      send(response, 404, "Not found");
      return;
    }

    send(response, 200, fs.readFileSync(filePath), { "Content-Type": contentType(filePath) });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`FGD report comment server: http://0.0.0.0:${port}/`);
  console.log(`Serving reports from: ${rootDir}`);
  console.log(`Saving comments to: ${dataPath}`);
});
