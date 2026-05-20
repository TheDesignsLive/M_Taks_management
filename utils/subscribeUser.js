// src/utils/subscribeUser.js

export async function subscribeUser(beamsClient, sessionData) {
  if (!beamsClient || !sessionData || !sessionData.loggedIn) return;

  const myUniqueId =
    sessionData.role === "admin"
      ? `admin-${sessionData.adminId}`
      : `${sessionData.userId}`;

  if ("caches" in window) {
    try {
      const cache = await caches.open("tms-user-data");
      await cache.put("/my-id", new Response(myUniqueId));
    } catch (e) {
      console.error("[Beams Cache Exception]", e);
    }
  }

  const expectedInterestKey =
    sessionData.role === "admin"
      ? `admin-${sessionData.adminId}-admins`
      : `user-${sessionData.userId}`;

  try {
    await beamsClient.clearDeviceInterests();
    localStorage.removeItem("beams_interest_key");

    if (sessionData.role === "admin") {
      await beamsClient.addDeviceInterest(`admin-${sessionData.adminId}`);
      await beamsClient.addDeviceInterest(`admin-user-${sessionData.adminId}`);
    } else if (sessionData.role === "owner") {
      await beamsClient.addDeviceInterest(`admin-${sessionData.adminId}`);
      await beamsClient.addDeviceInterest(`user-${sessionData.userId}`);
      if (sessionData.team_id) {
        await beamsClient.addDeviceInterest(`company-${sessionData.adminId}-team-${sessionData.team_id}`);
      }
    } else {
      await beamsClient.addDeviceInterest(`company-${sessionData.adminId}-all`);
      await beamsClient.addDeviceInterest(`user-${sessionData.userId}`);
      if (sessionData.team_id) {
        await beamsClient.addDeviceInterest(`company-${sessionData.adminId}-team-${sessionData.team_id}`);
      }
    }

    window.__beamsClient = beamsClient;
    localStorage.setItem("beams_interest_key", expectedInterestKey);
    console.log("[Beams] ✅ Synchronization Complete");
  } catch (err) {
    console.warn("[Beams Interest Error]:", err.message);
  }
}