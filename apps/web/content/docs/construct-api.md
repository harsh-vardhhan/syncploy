# `api` & Lambda Ingress

The `api` construct defines serverless HTTP endpoints using standard Web Fetch API conventions (`Request` and `Response`).

```typescript
import { api } from "@syncploy/sdk";

export const myEndpoint = api(
  {
    path: "/documents/:id",
    method: "GET",
    ingress: "function-url",
    memory: 1024,
    timeout: "15s",
    concurrency: 50,
  },
  async (req) => {
    return Response.json({ message: "Hello from Syncploy!" });
  }
);
```

---

## Ingress Modes: Function URLs vs API Gateway

Syncploy supports two distinct ingress modes:

| Ingress Mode | Description | Latency Overhead | Pricing | Best For |
| --- | --- | --- | --- | --- |
| `"function-url"` | Direct AWS Lambda Function URL | **Sub-50ms** | **$0.00** (Free direct invocation) | Microservices, High-throughput APIs, Webhooks |
| `"api-gateway"` | Amazon API Gateway HTTP API v2 | ~70-120ms | $1.00 / million requests | Legacy path prefix routing, custom authorizers |

> [!TIP]
> Function URLs eliminate the $1.00/million API Gateway toll entirely while removing cold start routing hops.

---

## Configuration Reference

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `string` | `"/"` | URL path route |
| `method` | `"GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY"` | `"GET"` | HTTP method verb |
| `ingress` | `"function-url" | "api-gateway"` | `"function-url"` | Ingress routing mechanism |
| `memory` | `number` | `256` | Memory allocation in MB (128 to 10240) |
| `timeout` | `string | number` | `"30s"` | Maximum execution duration |
| `concurrency` | `number` | `undefined` | Reserved concurrency cap (prevents Denial-of-Wallet) |
| `cors` | `boolean | CorsOptions` | `true` | Automatic CORS preflight headers |
| `packageType` | `"Zip" | "Image"` | `"Zip"` | ESM bundle vs Native Docker container image |

---

## Container Packaging (`packageType: "Image"`)

When you require custom native binaries, PyTorch models, or LibreOffice tools inside Lambda:

```typescript
export const docxConverter = api(
  {
    path: "/convert",
    method: "POST",
    packageType: "Image",
    dockerfile: "./Dockerfile",
    memory: 3008,
    timeout: "120s",
  },
  async (req) => {
    // Executes inside your custom Docker container
    return Response.json({ status: "converted" });
  }
);
```
