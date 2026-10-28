import { api, Table, Queue, Bucket } from "@syncploy/sdk";

// 1. Production DynamoDB Single-Table
export const ordersTable = new Table("orders", {
  logicalId: "OrdersTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  pointInTimeRecovery: true,
  stream: "NEW_IMAGE",
  indexes: {
    GSI1: { partitionKey: "GSI1PK", sortKey: "GSI1SK", projection: "ALL" },
  },
});

// 2. High-Reliability SQS Queue with Auto-Provisioned DLQ
export const fulfillmentQueue = new Queue("fulfillment", {
  logicalId: "FulfillmentQueue",
  visibilityTimeout: "180s", // 6x consumer timeout (30s * 6 = 180s)
  deadLetterQueue: {
    maxReceiveCount: 3,
  },
});

// 3. Compliant S3 Bucket for Invoices & Receipts
export const invoicesBucket = new Bucket("invoices", {
  logicalId: "InvoicesBucket",
  versioned: true,
  publicAccessBlock: true,
});

// 4. S3 EventBridge Routing to SQS Queue
invoicesBucket.on("objectCreated", fulfillmentQueue, { prefix: "invoices/", suffix: ".pdf" });

// 5. High-Throughput Public Ingress: Create Order (Lambda Function URL)
export const createOrder = api(
  {
    path: "/orders",
    method: "POST",
    ingress: "function-url",
    timeout: "15s",
    memory: "512MB",
    concurrency: 25, // Denial-of-Wallet cap
    cors: { allowOrigins: ["*"] },
  },
  async (req) => {
    const orderData = await req.json();
    const orderId = orderData.id || `ord-${Date.now()}`;

    // Store in DynamoDB
    await ordersTable.put({
      PK: `ORDER#${orderId}`,
      SK: `METADATA`,
      id: orderId,
      status: "PENDING",
      amount: orderData.amount,
      createdAt: new Date().toISOString(),
    });

    // Dispatch async fulfillment task to SQS
    await fulfillmentQueue.send({ orderId, amount: orderData.amount });

    return Response.json({ status: "created", orderId });
  }
);

// 6. Fast Lookup REST API (API Gateway HTTP API v2)
export const getOrder = api(
  {
    path: "/orders/:id",
    method: "GET",
    ingress: "api-gateway",
    timeout: "10s",
    memory: "256MB",
  },
  async ({ id }: { id: string }) => {
    const item = await ordersTable.get({
      PK: `ORDER#${id}`,
      SK: "METADATA",
    });
    return item ? Response.json(item) : new Response("Order not found", { status: 404 });
  }
);

// 7. Background Worker: SQS Fulfillment Consumer
export const processFulfillment = fulfillmentQueue.consumer(
  {
    batchSize: 5,
    timeout: "30s",
    concurrency: 5,
  },
  async (record: any) => {
    console.log("Fulfilling order:", record.orderId);
  }
);

// 8. Stream Worker: DynamoDB Change Stream (Audit / Analytics)
export const auditStreamWorker = ordersTable.stream(
  {
    batchSize: 50,
    startingPosition: "LATEST",
    concurrency: 3,
  },
  async (record: any) => {
    console.log("DynamoDB Change Audit:", record.eventName);
  }
);
