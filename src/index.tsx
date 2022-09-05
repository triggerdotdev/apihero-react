import { ApiHeroEndpoint } from "@apihero/core";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import React from "react";
import invariant from "tiny-invariant";

const queryClient = new QueryClient();

export function APIHeroProvider({ children }: { children: React.ReactNode }) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const BASE_URL =
  process.env.APIHERO_URL ??
  process.env.NEXT_PUBLIC_APIHERO_URL ??
  "https://app.apihero.run";

const PROJECT_KEY =
  process.env.APIHERO_PROJECT_KEY ??
  process.env.NEXT_PUBLIC_APIHERO_PROJECT_KEY;

invariant(
  PROJECT_KEY,
  "APIHero project key is required. Set APIHERO_PROJECT_KEY or NEXT_PUBLIC_APIHERO_PROJECT_KEY"
);

export function createEndpoint<TProps, TResponseBody, THeaders>(
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>,
  queryOptions: UseQueryOptions<TResponseBody, Error> = {}
): (props: TProps | undefined) => UseQueryResult<TResponseBody, Error> {
  const defaultOptions: UseQueryOptions<TResponseBody, Error> = {
    refetchOnWindowFocus: false,
    retry: false,
  };

  const options = { ...defaultOptions, ...queryOptions };

  return (props) => {
    const useQueryResult = useQuery<TResponseBody, Error>(
      [endpoint.clientId, endpoint.id, props],
      async (): Promise<TResponseBody> => {
        const res = await fetch(`${BASE_URL}/gateway/run`, {
          method: "POST",
          body: JSON.stringify({
            endpoint,
            params: props,
          }),
          headers: {
            Authorization: `token ${PROJECT_KEY}`,
          },
        });

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        return res.json();
      },
      options
    );

    return useQueryResult;
  };
}
