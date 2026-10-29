import app from "./app";
import { env } from "./config/env";
import {cleanupMedia} from './security/mediaService';
import {drainRecovery} from './security/recovery';

app.listen(env.port, () => {
  console.log(`TradePilot API running on port ${env.port}`);
});
// Bounded, durable work; no extra paid worker. Each feature stays independently gated.
let busy=false;
const timer=setInterval(async()=>{if(busy)return;busy=true;try{await drainRecovery();await cleanupMedia();}catch{console.error('Feature maintenance temporarily unavailable');}finally{busy=false;}},30000);
timer.unref();
