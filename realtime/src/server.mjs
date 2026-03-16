import "dotenv/config";
import { createRealtimeServer } from "./create-server.mjs";

const port = Number(process.env.PORT || process.env.REALTIME_PORT || 4001);
const server = createRealtimeServer();

await server.listen(port, "0.0.0.0");
console.log(`[realtime] listening on :${port}`);
