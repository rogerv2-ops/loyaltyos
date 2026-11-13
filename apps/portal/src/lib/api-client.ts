import i18n from "./i18n";
const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const programId = sessionStorage.getItem("program-id") ?? "prog_001";

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": i18n.language || "es-MX",
      "X-Program-Id": programId,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("auth-token");
    sessionStorage.removeItem("member-id");
    window.dispatchEvent(new CustomEvent("loyaltyos:auth-required"));
    throw new ApiError(401, i18n.t("UNAUTHORIZED", { ns: "errors" }));
  }

  const body = (await response.json()) as { data?: T; error?: { message: string } };
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.message ?? i18n.t("REQUEST_ERROR", { ns: "errors" }),
    );
  }

  return body.data as T;
}

export async function postApi<T>(path: string, data: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function patchApi<T>(path: string, data: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
