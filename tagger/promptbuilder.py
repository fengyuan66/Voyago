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

    menu = restaurant.get("menu", [])
    if isinstance(menu, list):
        menu_text = ", ".join(str(item) for item in menu)
    else:
        menu_text = str(menu)




    return f"""

You are a restaurant tagging system.

Choose ONLY from the allowed tags below.
Do not invent new tags.
Return JSON only.

Allowed tags:
{json.dumps(allowed_tags)}

Restaurant:
Name: {restaurant.get("name", "")}
Cuisine / Genre: {restaurant.get("cuisine", "")}
Price range: {restaurant.get("price_range", "")}
Description: {restaurant.get("description", "")}
Menu: {menu_text}
Features: {features_text}
Location tag: {restaurant.get("location_tag", "")}
Status: {restaurant.get("status", "")}
Address: {restaurant.get("address", "")}
Hours: {restaurant.get("hours", "")}
Website: {restaurant.get("website", "")}

Return exactly this JSON shape:
{{
  "tags": []
}}
""".strip()