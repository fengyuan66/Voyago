import json
from typing import Any, Dict, List

def build_tagging_prompt(restaurant: Dict[str, Any], allowed_tags: List[str]) -> str:

    """ Converts one restaurant obj into a prompt for tagging

    args:
    - restaurant: Dictionary containg restaurant info
    - allowed-tags: catologue of tags the AI can choose from

    returns prompt as string for LLM
    """

    features = restaurant.get("features", [])

    if isinstance(features, list):
        features_text = ", ".join(str(feature) for feature in features)
    else:
        features_text = str(features)




    return f"""

You are a restaurant tagging system.

Choose ONLY from the allowed tags below.
Do not invent new tags.
Return JSON only.

Allowed tags:
{json.dumps(allowed_tags)}

Restaurant:
Name: {restaurant.get("name", "")}
Cuisine: {restaurant.get("cuisine", "")}
Price range: {restaurant.get("price_range", "")}
Description: {restaurant.get("description", "")}
Features: {features_text}

Return exactly this JSON shape:
{{
  "tags": []
}}
""".strip()