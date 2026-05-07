from typing import Any, Dict, List
from llm import ask_json
from promptbuilder import build_tagging_prompt

from tags import ALLOWED_TAGS


def tag_restaurant(restaurant: Dict[str, Any]) -> List[str]:
    
    prompt = build_tagging_prompt(restaurant, ALLOWED_TAGS)
    result = ask_json(prompt)

    return validate_tag(result.get("tags", []), ALLOWED_TAGS)


def tag_restaurants(restaurants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:

    tagged_restaurants = []

    for restaurant in restaurants:
        tagged_restaurant = restaurant.copy()
        tagged_restaurant["llm_tags"] = tag_restaurant(restaurant)
        tagged_restaurants.append(tagged_restaurant)

    return tagged_restaurants


def validate_tag(rawtags: Any, allowedtags: List[str]) -> List[str]:
    if not isinstance(rawtags, list):
        return []

    allowed_set = set(allowedtags)
    cleanedtags = []

    for tag in rawtags:
        if isinstance(tag, str) and tag in allowed_set and tag not in cleanedtags:
            cleanedtags.append(tag)

    return cleanedtags
    
