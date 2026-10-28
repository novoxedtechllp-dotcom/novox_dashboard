import cron from "node-cron";

const RENDER_URL = "https://novox-dashboard-w7d5.onrender.com";

export const startKeepAliveCron = () => {
  // Ping self every 4 minutes to prevent Render from idling
  cron.schedule("*/4 * * * *", async () => {
    try {
      const res = await fetch(`${RENDER_URL}/api/health`);
      console.log(`[Keep-Alive] Pinged ${RENDER_URL} — Status: ${res.status}`);
    } catch (err) {
      console.error("[Keep-Alive] Ping failed:", err.message);
    }
  });

  console.log("[Keep-Alive] Cron scheduled — pinging every 4 minutes.");
};
