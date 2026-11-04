import app from "./app";
import {cleanupMedia} from "./security/mediaService";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`TradePilot API running on port ${env.port}`);
});

// Bounded maintenance uses the existing media flag; no provider is enabled here.
let mediaMaintenanceBusy=false;
const mediaTimer=setInterval(async()=>{if(mediaMaintenanceBusy||!env.mediaUploadsEnabled)return;mediaMaintenanceBusy=true;try{await cleanupMedia();}catch{console.error('Media cleanup temporarily unavailable');}finally{mediaMaintenanceBusy=false;}},30000);
mediaTimer.unref();
