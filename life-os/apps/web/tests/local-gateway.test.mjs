import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer, loadConfigFromFile } from "vite";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(webRoot, "vite.config.ts");
const apiRoutePattern = "^/life-os/api(?:/|$)";

test("configures the same API boundary for development and preview", async () => {
  const loaded = await loadConfigFromFile(
    {
      command: "serve",
      mode: "test",
      isSsrBuild: false,
      isPreview: false,
    },
    configPath,
    webRoot,
  );

  assert.ok(loaded, "expected Vite configuration to load");

  const developmentProxy = loaded.config.server?.proxy;
  const previewProxy = loaded.config.preview?.proxy;

  assert.deepEqual(developmentProxy, previewProxy);
  assert.deepEqual(developmentProxy?.[apiRoutePattern], {
    target: "http://127.0.0.1:8080",
    changeOrigin: false,
  });
});

test("proxies API requests before applying the LifeOS SPA fallback", async (context) => {
  const upstream = createHttpServer((request, response) => {
    response.statusCode = request.url?.endsWith("/missing") ? 404 : 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ path: request.url }));
  });
  let gateway;
  context.after(async () => {
    if (gateway) {
      await gateway.close();
    }
    if (upstream.listening) {
      await close(upstream);
    }
  });
  await listen(upstream);

  const upstreamOrigin = serverOrigin(upstream);
  gateway = await createViteServer({
    root: webRoot,
    configFile: configPath,
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      proxy: {
        [apiRoutePattern]: {
          target: upstreamOrigin,
          changeOrigin: false,
        },
      },
    },
  });
  await gateway.listen();

  const gatewayOrigin = serverOrigin(gateway.httpServer);
  const apiResponse = await fetch(`${gatewayOrigin}/life-os/api/v1/gateway-probe?source=browser`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  const missingApiResponse = await fetch(`${gatewayOrigin}/life-os/api/v1/missing`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  const deepLinkResponse = await fetch(`${gatewayOrigin}/life-os/app/today`, {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(5_000),
  });
  const similarUiPathResponse = await fetch(`${gatewayOrigin}/life-os/apiary`, {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(5_000),
  });

  assert.equal(apiResponse.status, 200);
  assert.deepEqual(await apiResponse.json(), {
    path: "/life-os/api/v1/gateway-probe?source=browser",
  });
  assert.equal(missingApiResponse.status, 404);
  assert.deepEqual(await missingApiResponse.json(), {
    path: "/life-os/api/v1/missing",
  });

  assert.equal(deepLinkResponse.status, 200);
  assert.match(deepLinkResponse.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await deepLinkResponse.text(), /<title>LifeOS<\/title>/);

  assert.equal(similarUiPathResponse.status, 200);
  assert.match(similarUiPathResponse.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await similarUiPathResponse.text(), /<title>LifeOS<\/title>/);
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function serverOrigin(server) {
  const address = server.address();
  assert.ok(address && typeof address !== "string", "expected a TCP server address");
  return `http://127.0.0.1:${address.port}`;
}
