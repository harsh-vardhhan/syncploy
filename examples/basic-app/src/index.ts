import { api, Table, Bucket, Queue } from "@syncploy/sdk";

// Infrastructure Resources
export const usersTable = new Table("users", {
  partitionKey: { name: "id", type: "string" },
  sortKey: { name: "createdAt", type: "string" },
});

export const documentsBucket = new Bucket("documents");
export const emailQueue = new Queue("emails");

// API Endpoints
export const health = api(
  { method: "GET", path: "/health" },
  async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
);

export const getUser = api(
  { method: "GET", path: "/users/:id" },
  async ({ id }: { id: string }) => {
    return {
      id,
      name: `User ${id}`,
      active: true,
    };
  }
);

export const createUser = api(
  { method: "POST", path: "/users" },
  async ({ name, email }: { name: string; email: string }) => {
    return {
      id: Math.random().toString(36).substring(7),
      name,
      email,
      created: true,
    };
  }
);
