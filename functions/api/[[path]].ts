interface PagesEnv {
  BACKEND_URL: string;
}

type PagesRequestContext<Env> = {
  request: Request;
  env: Env;
};

export const onRequest = async ({ request, env }: PagesRequestContext<PagesEnv>) => {
  const backendBase = (env.BACKEND_URL || "https://taketalon-pro.onrender.com").replace(/\/$/, "");
  const incomingUrl = new URL(request.url);
  const backendUrl = `${backendBase}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(request.headers);
  headers.set("host", new URL(backendBase).host);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");

  const proxiedRequest = new Request(backendUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  return fetch(proxiedRequest);
};
