import { GoogleAuth } from "google-auth-library";

const _auth = new GoogleAuth();

/** Thin fetch wrapper that calls an authenticated Cloud Run endpoint with JSON body. */
export async function invokeCloudRun<T = unknown>(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  const client = await _auth.getIdTokenClient(url);
  const res = await client.request<T>({
    url,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(body ? {} : { "Content-Length": "0" }),
    },
    data: body,
  });
  return res.data as T;
}
