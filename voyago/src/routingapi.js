export async function getRoute(data) {
  const res = await fetch("http://127.0.0.1:8000/route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.detail || "Routing request failed");
  }
  return payload;
}
