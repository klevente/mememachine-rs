import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

  try {
    const url = new URL("/", `http://${host}`);
    // if we can make a HEAD request to ourselves, then we're good.
    await fetch(url.toString(), { method: "HEAD" }).then((r) => {
      if (!r.ok) return Promise.reject(r);
    });
    return new Response(JSON.stringify({ status: "ok" }));
  } catch (error: unknown) {
    console.log("healthcheck ❌", { error });
    return new Response(JSON.stringify({ status: "unhealthy" }), {
      status: 500,
    });
  }
}
