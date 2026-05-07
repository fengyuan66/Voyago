import json
import os
from typing import Any, Dict
from openai import OpenAI

HACKCLUB_URL = "https://ai.hackclub.com/proxy/v1"

apikey = os.getenv("HACKCLUB_AI_API_KEY")

def get_client() -> OpeanAI:

    if not apikey:
        raise RuntimeError(
            "Hackclub AI key not found! Check env"
        )

    return OpenAI(
        api_key = apikey,
        base_url = HACKCLUB_URL
    )

def ask_json(prompt: str) -> Dict[str, Any]:

    client = get_client()

    model = os.getenv("HACKCLUB_AI_MODEL", "meta-llama/llama-3.1-70b-instruct")

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

    if content is None:
        raise RuntimeError("Model returned empty response!! Prompt given: " + content)
    
    return json.loads(content)