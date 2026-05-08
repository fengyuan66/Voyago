export async function getRoute(data) {
  let res;
  try {
    res = await fetch("http://127.0.0.1:8000/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw new Error(`Routing network error: ${error?.message || "Failed to fetch"} (url: http://127.0.0.1:8000/route)`);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = payload?.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    }
    if (detail && typeof detail === "object") {
      const message = detail.message || "Routing request failed";
      const debug = detail.debug ? ` | debug: ${JSON.stringify(detail.debug)}` : "";
      throw new Error(`${message}${debug}`);
    }
    throw new Error("Routing request failed");
  }
  return payload;
}
