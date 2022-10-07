import { ApiHeroEndpoint } from "@apihero/core";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
} from "vitest";
import { APIHeroProvider, createQuery, invalidateQuery } from "../src";
import React, { useCallback } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";

let count = 0;

const handlers = [
  rest.post(
    "https://gateway.apihero.run/gateway/run",
    async (req, res, ctx) => {
      const body = await req.json();

      const { endpoint, params } = body;

      count = count + 1;

      if (endpoint.id === "mockGetRepo") {
        return res(
          ctx.status(200),
          ctx.json({
            username: `ericallam${count}`,
          })
        );
      }

      return res(
        ctx.status(404),
        ctx.json({
          error: "Endpoint not found",
        })
      );
    }
  ),
];

const server = setupServer(...handlers);

const mockGetRepo: ApiHeroEndpoint<
  { id: string },
  { username: string; repo: string }
> = {
  id: "mockGetRepo",
  client: "mockClient",
};

const useMockGetRepoEndpoint = createQuery(mockGetRepo);

describe("using invalidateQuery", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(() => {
    count = 0;
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should allow invalidating a query for specific endpoint with props", async () => {
    function App({ id }: { id: string }) {
      const repoResult = useMockGetRepoEndpoint({ id });

      const invalidate = useCallback(() => {
        invalidateQuery(mockGetRepo, { id }).catch(console.error);
      }, [id]);

      if (repoResult.status === "success") {
        return (
          <>
            <div>Success</div>
            <div>{repoResult.data.username}</div>
            <button onClick={() => invalidate()}>Submit</button>
          </>
        );
      }

      return <div>Loading...</div>;
    }

    render(
      <APIHeroProvider projectKey="key_123">
        <App id="1" />
      </APIHeroProvider>
    );

    const button = await screen.findByRole("button");

    const result1 = await screen.findByText("ericallam1");

    expect(result1).toBeTruthy();

    fireEvent.click(button);

    const result2 = await screen.findByText("ericallam2");

    expect(result2).toBeTruthy();
  });

  it("should allow invalidating a query for specific endpoint without props", async () => {
    function App({ id }: { id: string }) {
      const repoResult = useMockGetRepoEndpoint({ id });

      const invalidate = useCallback(() => {
        invalidateQuery(mockGetRepo).catch(console.error);
      }, []);

      if (repoResult.status === "success") {
        return (
          <>
            <div>Success</div>
            <div>{repoResult.data.username}</div>
            <button onClick={() => invalidate()}>Submit</button>
          </>
        );
      }

      return <div>Loading...</div>;
    }

    render(
      <APIHeroProvider projectKey="key_123">
        <App id="1" />
      </APIHeroProvider>
    );

    const button = await screen.findByRole("button");

    const result1 = await screen.findByText("ericallam1");

    expect(result1).toBeTruthy();

    fireEvent.click(button);

    const result2 = await screen.findByText("ericallam2");

    expect(result2).toBeTruthy();
  });
});
