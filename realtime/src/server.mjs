import "dotenv/config";
import { createRealtimeServer } from "./create-server.mjs";

const port = Number(process.env.REALTIME_PORT || 4001);
const server = createRealtimeServer();

await server.listen(port);
console.log(`[realtime] listening on :${port}`);
