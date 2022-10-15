import { ApiHeroEndpoint } from "@apihero/core";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  useQueryClient,
  InvalidateQueryFilters,
  InvalidateOptions,
  RefetchQueryFilters,
  RefetchOptions,
} from "@tanstack/react-query";
import React, { useContext } from "react";

const GATEWAY_URL =
  process.env.APIHERO_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_APIHERO_GATEWAY_URL ??
  "https://gateway.apihero.run";

const PROJECT_KEY =
  process.env.APIHERO_PROJECT_KEY ??
  process.env.NEXT_PUBLIC_APIHERO_PROJECT_KEY;

const queryClient = new QueryClient();

type ApiHeroContextType = {
  projectKey?: string;
  gatewayUrl: string;
};

const ApiHeroContext = React.createContext<ApiHeroContextType>({
  projectKey: PROJECT_KEY,
  gatewayUrl: GATEWAY_URL,
});

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

export const useApiHeroClient = useQueryClient;

export async function invalidateQuery<TProps, TResponseBody, THeaders>(
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>,
  props?: TProps,
  filters?: InvalidateQueryFilters,
  options?: InvalidateOptions
) {
  await queryClient.invalidateQueries(
    [endpoint.clientId, endpoint.id, props],
    filters,
    options
  );
}

export async function refetchQuery<TProps, TResponseBody, THeaders>(
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>,
  props?: TProps,
  filters?: RefetchQueryFilters,
  options?: RefetchOptions
) {
  await queryClient.refetchQueries(
    [endpoint.clientId, endpoint.id, props],
    filters,
    options
  );
}

export type CreateMutationOptions = {
  invalidates?: Array<ApiHeroEndpoint<unknown, unknown>>;
  projectKey?: string;
};

export function createMutation<TProps, TResponseBody, THeaders>(
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>,
  options?: CreateMutationOptions
): (
  mutationOptions?: UseMutationOptions<TResponseBody, Error, TProps>
) => UseMutationResult<TResponseBody, Error, TProps> & {
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>;
} {
  return (mutationOptions) => {
    const contextOptions = useContext(ApiHeroContext);
    const resolvedProjectKey = options?.projectKey ?? contextOptions.projectKey;

    if (!resolvedProjectKey) {
      throw new Error(
        "createMutation: projectKey is missing. Did you forget to wrap your app in an <ApiHeroProvider>? Alternatively, you can set the APIHERO_PROJECT_KEY or NEXT_PUBLIC_APIHERO_PROJECT_KEY environment variable."
      );
    }

    const useMutationResult = useMutation<TResponseBody, Error, TProps>(
      (props) => {
        return fetch(`${contextOptions.gatewayUrl}/gateway/run`, {
          method: "POST",
          headers: {
            Authorization: `token ${resolvedProjectKey}`,
          },
          body: JSON.stringify({
            endpoint,
            params: props,
          }),
        }).then((res) => res.json());
      },
      {
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
          mutationOptions?.onSuccess?.(data, variables, context);

          options?.invalidates?.forEach((endpoint) => {
            queryClient.invalidateQueries([endpoint.clientId, endpoint.id]);
          });
        },
      }
    );

    return { ...useMutationResult, endpoint };
  };
}

export interface CreateQueryOptions<TResponseBody, TError>
  extends UseQueryOptions<TResponseBody, TError> {
  projectKey?: string;
}

export function createQuery<TProps, TResponseBody, THeaders>(
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>,
  options: CreateQueryOptions<TResponseBody, Error> = {}
): (
  props: TProps | undefined,
  queryOptions?: UseQueryOptions<TResponseBody, Error>
) => UseQueryResult<TResponseBody, Error> & {
  endpoint: ApiHeroEndpoint<TProps, TResponseBody, THeaders>;
} {
  const defaultOptions: UseQueryOptions<TResponseBody, Error> = {
    refetchOnWindowFocus: false,
    retry: false,
  };

  const opts = { ...defaultOptions, ...options };

  return (props, queryOptions) => {
    const contextOptions = useContext(ApiHeroContext);
    const resolvedProjectKey = options?.projectKey ?? contextOptions.projectKey;

    if (!resolvedProjectKey) {
      throw new Error(
        "createQuery: projectKey is missing. Did you forget to wrap your app in an <ApiHeroProvider>? Alternatively, you can set the APIHERO_PROJECT_KEY or NEXT_PUBLIC_APIHERO_PROJECT_KEY environment variable."
      );
    }

    const useQueryResult = useQuery<TResponseBody, Error>(
      [endpoint.clientId, endpoint.id, props],
      async (context): Promise<TResponseBody> => {
        const res = await fetch(`${contextOptions.gatewayUrl}/gateway/run`, {
          method: "POST",
          body: JSON.stringify({
            endpoint,
            params: props,
          }),
          headers: {
            Authorization: `token ${resolvedProjectKey}`,
          },
          signal: context.signal,
        });

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        return res.json();
      },
      { ...opts, ...(queryOptions ?? {}) }
    );

    return { ...useQueryResult, endpoint };
  };
}

export const createEndpoint = createQuery;
