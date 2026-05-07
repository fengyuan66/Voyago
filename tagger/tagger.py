from typing import Any, Dict, List
from llm import ask_json
from promptbuilder import build_tagging_prompt

from tags import ALLOWED_TAGS


def tag_restaurant(restaurant: Dict[str, Any]) -> List[str]:
    print(f"[DEBUG] Building prompt for: {restaurant.get('name', '<unknown>')}")  #DEBUG
    
    prompt = build_tagging_prompt(restaurant, ALLOWED_TAGS)
    print(f"[DEBUG] Prompt length: {len(prompt)} chars")  #DEBUG
    result = ask_json(prompt)
    print(f"[DEBUG] Raw model keys: {list(result.keys()) if isinstance(result, dict) else type(result).__name__}")  #DEBUG

    cleaned = validate_tag(result.get("tags", []), ALLOWED_TAGS)
    print(f"[DEBUG] Cleaned tag count: {len(cleaned)}")  #DEBUG
    return cleaned


def tag_restaurants(restaurants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:

    tagged_restaurants = []
    print(f"[DEBUG] Starting batch tagging for {len(restaurants)} restaurants")  #DEBUG

    for idx, restaurant in enumerate(restaurants, start=1):
        print(f"[DEBUG] Tagging restaurant {idx}/{len(restaurants)}: {restaurant.get('name', '<unknown>')}")  #DEBUG
        tagged_restaurant = restaurant.copy()
        tagged_restaurant["llm_tags"] = tag_restaurant(restaurant)
        tagged_restaurants.append(tagged_restaurant)
    print("[DEBUG] Batch tagging complete")  #DEBUG

    return tagged_restaurants


def validate_tag(rawtags: Any, allowedtags: List[str]) -> List[str]:
    print(f"[DEBUG] Validating raw tags type: {type(rawtags).__name__}")  #DEBUG
    if not isinstance(rawtags, list):
        print("[DEBUG] Raw tags not list; returning []")  #DEBUG
        return []

    allowed_set = set(allowedtags)
    cleanedtags = []

    for tag in rawtags:
        if isinstance(tag, str) and tag in allowed_set and tag not in cleanedtags:
            cleanedtags.append(tag)

    print(f"[DEBUG] Valid tags after filtering: {cleanedtags}")  #DEBUG
    return cleanedtags
    
