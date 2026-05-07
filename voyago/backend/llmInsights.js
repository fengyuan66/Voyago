import { summarizeTopTagPrefs } from "./recommender.js";

const HACKCLUB_BASE_URL = process.env.HACKCLUB_BASE_URL ?? "https://ai.hackclub.com/proxy/v1";
const HACKCLUB_MODEL = process.env.HACKCLUB_MODEL ?? "gpt-4o-mini";

function canRunInsights(userProfile) {
  const ratingsCount = userProfile.totalRatings ?? 0;
  if (ratingsCount < 6) {
    return false;
  }
  if (ratingsCount % 5 !== 0) {
    return false;
  }
  return true;
}

function buildPrompt(userProfile) {
  const recent = (userProfile.ratings ?? []).slice(-20);
  const topPrefs = summarizeTopTagPrefs(userProfile, 6);
  return [
    "You are a restaurant preference analyst.",
    "Given rating signals over tags, infer likely user taste and exploration ideas.",
    "Return strict JSON with this shape:",
    '{"profile_summary":"...", "hypotheses":["..."], "exploration_tags":["tag_a","tag_b","tag_c"], "confidence":"low|medium|high"}',
    "",
    `Top liked tags: ${JSON.stringify(topPrefs.liked)}`,
    `Top disliked tags: ${JSON.stringify(topPrefs.disliked)}`,
    `Recent ratings: ${JSON.stringify(recent)}`,
  ].join("\n");
}

export async function maybeGenerateInsights(userProfile) {
  const apiKey = process.env.HACKCLUB_API_KEY;
  if (!apiKey || !canRunInsights(userProfile)) {
    return null;
  }

  const response = await fetch(`${HACKCLUB_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HACKCLUB_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are precise and conservative with inferences." },
        { role: "user", content: buildPrompt(userProfile) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Hack Club API returned status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = JSON.parse(content);
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}
