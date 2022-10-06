import { ApiHeroEndpoint } from "@apihero/core";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { APIHeroProvider, createMutation, createQuery } from "../src";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";

const storage = new Map<string, string>();

const handlers = [
  rest.post(
    "https://gateway.apihero.run/gateway/run",
    async (req, res, ctx) => {
      const body = await req.json();

      const { endpoint, params } = body;

      if (params?.name) {
        storage.set("name", params?.name);
      }

      return res(
        ctx.status(200),
        ctx.json({
          name: storage.get("name") ?? "Eric Allam",
          endpoint,
          params,
        })
      );
    }
  ),
];

const server = setupServer(...handlers);

const mockGetEndpoint: ApiHeroEndpoint<
  { id: string },
  { name: string; endpoint: any; params: any }
> = {
  id: "mockGetEndpoint",
  client: "mockClient",
};

const mockPostEndpoint: ApiHeroEndpoint<
  { name: string },
  { name: string; endpoint: any; params: any }
> = {
  id: "mockPostEndpoint",
  client: "mockClient",
};

const useMockGetEndpoint = createQuery(mockGetEndpoint);
const useMockPostEndpoint = createMutation(mockPostEndpoint, {
  invalidates: [mockGetEndpoint],
});

describe("Creating an endpoint hook", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    storage.clear();
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should create a mutation for the post endpoint", async () => {
    function App() {
      const { status, error, mutate, data } = useMockPostEndpoint({
        onSuccess: (data) => {},
      });

      if (status === "loading") {
        return <div>Loading</div>;
      }

      if (status === "error") {
        return <div>Error: {error.message}</div>;
      }

      if (status === "success") {
        return (
          <>
            <div>Success</div>
            <div id="name">Name: {data.name}</div>
            <div id="endpoint">{JSON.stringify(data.endpoint)}</div>
            <div id="params">{JSON.stringify(data.params)}</div>
          </>
        );
      }

      return (
        <>
          <button onClick={() => mutate({ name: "Anna Allam" })}>Submit</button>
        </>
      );
    }

    const { findAllByText, findByRole } = render(
      <APIHeroProvider projectKey="key_123">
        <App />
      </APIHeroProvider>
    );

    const button = await findByRole("button");

    fireEvent.click(button);

    expect(await findAllByText(/Anna\sAllam/)).toBeDefined();
  });

  it("should create a query for a get endpoint", async () => {
    function App() {
      const { data, status, error } = useMockGetEndpoint({ id: "1" });

      if (status === "loading") {
        return <div>Loading</div>;
      }

      if (status === "error") {
        return <div>Error: {error.message}</div>;
      }

      return (
        <>
          <div id="name">Name: {data.name}</div>
          <div id="endpoint">{JSON.stringify(data.endpoint)}</div>
          <div id="params">{JSON.stringify(data.params)}</div>
        </>
      );
    }

    const { findByText } = render(
      <APIHeroProvider projectKey="key_123">
        <App />
      </APIHeroProvider>
    );

    expect(await findByText(/Eric\sAllam/)).toBeDefined();
  });

  it("should be able to invalidate queries when doing a mutation", async () => {
    function App() {
      const query = useMockGetEndpoint({ id: "1" });
      const mutation = useMockPostEndpoint();

      if (mutation.status === "loading") {
        return <div>Loading</div>;
      }

      if (mutation.status === "error") {
        return <div>Error: {mutation.error.message}</div>;
      }

      return (
        <>
          <div id="name">Name: {query.isSuccess && query.data.name}</div>
          <button onClick={() => mutation.mutate({ name: "Anna Allam" })}>
            Submit
          </button>
        </>
      );
    }

    const { findByText, findByRole } = render(
      <APIHeroProvider projectKey="key_123">
        <App />
      </APIHeroProvider>
    );

    const button = await findByRole("button");

    fireEvent.click(button);

    expect(await findByText(/Anna\sAllam/)).toBeDefined();
  });
});
