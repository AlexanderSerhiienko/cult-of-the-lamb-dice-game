export function requireRealtimeInternal(request: Request): boolean {
  const providedSecret = request.headers.get("x-realtime-internal-secret");
  const expectedSecret = process.env.REALTIME_INTERNAL_SECRET ?? "dev-realtime-internal-secret";

  return providedSecret === expectedSecret;
}

