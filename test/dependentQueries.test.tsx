import { ApiHeroEndpoint } from "@apihero/core";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { APIHeroProvider, createQuery } from "../src";
import React from "react";
import { render, screen } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";

const handlers = [
  rest.post(
    "https://gateway.apihero.run/gateway/run",
    async (req, res, ctx) => {
      const body = await req.json();

      const { endpoint, params } = body;

      if (endpoint.id === "mockGetRepo") {
        return res(
          ctx.status(200),
          ctx.json({
            username: "ericallam",
          })
        );
      }

      if (endpoint.id === "mockGetUser" && params?.username === "ericallam") {
        return res(
          ctx.status(200),
          ctx.json({
            email: "eric@apihero.run",
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

const mockGetUser: ApiHeroEndpoint<{ username: string }, { email: string }> = {
  id: "mockGetUser",
  client: "mockClient",
};

const useMockGetRepoEndpoint = createQuery(mockGetRepo);
const useMockGetUserEndpoint = createQuery(mockGetUser);

describe("Creating an endpoint hook", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("should allow enabling queries through the second param to the query hook", async () => {
    function App() {
      const repoResult = useMockGetRepoEndpoint({ id: "1" });
      const userResult = useMockGetUserEndpoint(
        { username: repoResult.data?.username ?? "" },
        { enabled: !!repoResult.data?.username }
      );

      if (repoResult.status === "success" && userResult.status === "success") {
        return (
          <>
            <div>Success</div>
            <div id="email">{userResult.data.email}</div>
          </>
        );
      }

      return <div>Loading...</div>;
    }

    render(
      <APIHeroProvider projectKey="key_123">
        <App />
      </APIHeroProvider>
    );

    const result = await screen.findByText("eric@apihero.run");

    expect(result).toBeTruthy();
  });
});
