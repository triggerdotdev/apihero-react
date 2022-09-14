import { ApiHeroEndpoint } from "@apihero/core";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import React, { useContext } from "react";
import invariant from "tiny-invariant";

const GATEWAY_URL =
  process.env.APIHERO_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_APIHERO_GATEWAY_URL ??
  "https://gateway.apihero.run";

const PROJECT_KEY =
  process.env.APIHERO_PROJECT_KEY ??
  process.env.NEXT_PUBLIC_APIHERO_PROJECT_KEY;

const queryClient = new QueryClient();

type ApiHeroContextType = {
  projectKey: string;
  gatewayUrl: string;
};

const ApiHeroContext = React.createContext<ApiHeroContextType | null>(null);

export function APIHeroProvider({
  children,
  projectKey,
  gatewayUrl,
}: {
  children: React.ReactNode;
  projectKey?: string;
  gatewayUrl?: string;
}) {
  const resolvedProjectKey = projectKey ?? PROJECT_KEY;
  const resolvedGatewayUrl = gatewayUrl ?? GATEWAY_URL;

  invariant(
    resolvedProjectKey,
    "APIHeroProvider: projectKey is required, or you can set the APIHERO_PROJECT_KEY environment variable"
  );

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <ApiHeroContext.Provider
        value={{
          projectKey: resolvedProjectKey,
          gatewayUrl: resolvedGatewayUrl,
        }}
      >
        {children}
      </ApiHeroContext.Provider>
    </QueryClientProvider>
  );
}

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
    const { projectKey, gatewayUrl } = useContext(ApiHeroContext) ?? {};

    const useQueryResult = useQuery<TResponseBody, Error>(
      [endpoint.clientId, endpoint.id, props],
      async (): Promise<TResponseBody> => {
        const res = await fetch(`${gatewayUrl}/gateway/run`, {
          method: "POST",
          body: JSON.stringify({
            endpoint,
            params: props,
          }),
          headers: {
            Authorization: `token ${projectKey}`,
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
