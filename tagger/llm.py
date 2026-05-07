import json
import os
from typing import Any, Dict
from openai import OpenAI

HACKCLUB_URL = "https://ai.hackclub.com/proxy/v1"


def get_client() -> OpenAI:
    apikey = os.getenv("HACKCLUB_AI_API_KEY")
    print(f"[DEBUG] HACKCLUB_AI_API_KEY present: {bool(apikey)}")  #DEBUG
    if not apikey:
        raise RuntimeError(
            "Hackclub AI key not found! Check env"
        )

    print(f"[DEBUG] Creating OpenAI client with base_url={HACKCLUB_URL}")  #DEBUG
    return OpenAI(
        api_key = apikey,
        base_url = HACKCLUB_URL
    )

def ask_json(prompt: str) -> Dict[str, Any]:

    client = get_client()

    model = os.getenv("HACKCLUB_AI_MODEL", "meta-llama/llama-3.1-70b-instruct")
    print(f"[DEBUG] Using model: {model}")  #DEBUG
    print(f"[DEBUG] Prompt chars sent to model: {len(prompt)}")  #DEBUG

    response = client.chat.completions.create(
        model = model,
        messages = [
            {
                "role": "system",
                "content": "You return valid JSON only. No markdown. No explanations",
        
            },
            {"role": "user", "content": prompt}
        ],
        temperature = 0,
    )

    content = response.choices[0].message.content #CONFIGURE FOR DYNAMIC MESSAGE PULLING
    print(f"[DEBUG] Model response content present: {content is not None}")  #DEBUG
    if content is not None:
        print(f"[DEBUG] Model response preview: {content[:180]}")  #DEBUG

    if content is None:
        raise RuntimeError("Model returned empty response!! Prompt given: " + content)
    
    print("[DEBUG] Parsing model response JSON")  #DEBUG
    return json.loads(content)
