import { GoogleAuth } from "google-auth-library";

const _auth = new GoogleAuth();

/**
 * POST to an IAM-gated Cloud Run URL using the container's attached SA.
 * Returns parsed JSON.
 */
export async function invokeCloudRun(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<unknown> {
  const client = await _auth.getIdTokenClient(url);
  const res = await client.request({
    url,
    method,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body ? undefined : "0",
    },
    data: body,
  });
  return res.data;
}
