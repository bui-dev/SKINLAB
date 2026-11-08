import { getApiBaseUrl } from "@/config/env";
import { ApiError } from "@/lib/api/api-error";
import type { ApiRequestOptions } from "@/lib/api/types";
import { toSearchParams } from "@/lib/utils";

const DEFAULT_TIMEOUT_MS = 10_000;

function createUrl(
  path: string,
  baseUrl: string,
  query?: ApiRequestOptions["query"],
): URL {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), normalizedBaseUrl);

  if (query) url.search = toSearchParams(query).toString();

  return url;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new ApiError("The API returned invalid JSON.", {
        status: response.status,
        code: "INVALID_JSON",
        cause: error,
      });
    }
  }

  return text;
}

function errorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    baseUrl = getApiBaseUrl(),
    body,
    headers: initialHeaders,
    query,
    signal: callerSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...requestInit
  } = options;
  const url = createUrl(path, baseUrl, query);
  const headers = new Headers(initialHeaders);
  headers.set("Accept", "application/json");

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || typeof body === "string") {
      requestBody = body;
    } else {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(url, {
      ...requestInit,
      body: requestBody,
      headers,
      signal,
    });
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      throw new ApiError(
        errorMessage(
          responseBody,
          response.statusText || "API request failed.",
        ),
        {
          status: response.status,
          code: `HTTP_${response.status}`,
          details: responseBody,
        },
      );
    }

    return responseBody as T;
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new ApiError("The API request timed out.", {
        code: "TIMEOUT",
        cause: error,
      });
    }

    if (error instanceof ApiError) throw error;

    throw new ApiError("The API request could not be completed.", {
      code: "NETWORK_ERROR",
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
