import { describe, expect, it } from "bun:test";
import { api, HttpError } from "../src/index";

describe("@syncploy/sdk", () => {
  it("creates an API endpoint definition", () => {
    const endpoint = api(
      { method: "GET", path: "/hello/:name" },
      async ({ name }: { name: string }) => {
        return { message: `Hello ${name}!` };
      }
    );

    expect(endpoint._kind).toBe("api");
    expect(endpoint.options.method).toBe("GET");
    expect(endpoint.options.path).toBe("/hello/:name");
    expect(typeof endpoint.handler).toBe("function");
  });

  it("supports HttpError", () => {
    const err = new HttpError(404, "User not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });
});
