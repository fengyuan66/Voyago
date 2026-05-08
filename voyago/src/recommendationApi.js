const API_ROOT = "/api";

function createQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  return query.toString();
}

async function parseJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }
  return payload;
}

export async function fetchFeed({ userId, limit = 10, excludeIds = [] }) {
  const query = createQuery({
    user_id: userId,
    limit,
    exclude_ids: excludeIds.join(","),
  });
  const response = await fetch(`${API_ROOT}/feed?${query}`);
  return parseJson(response);
}

export async function submitRating({ userId, restaurantId, rating }) {
  const response = await fetch(`${API_ROOT}/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      restaurant_id: restaurantId,
      rating,
    }),
  });
  return parseJson(response);
}

export async function getLlmPicks({ userId, count = 5, excludeIds = [] }) {
  const response = await fetch(`${API_ROOT}/recommendations/llm-picks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      count,
      exclude_ids: excludeIds,
    }),
  });
  return parseJson(response);
}
