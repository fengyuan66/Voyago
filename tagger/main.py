import json

from pathlib import Path

from dotenv import load_dotenv

import argparse

from tagger import tag_restaurants

def load_restaurants(inputpath: Path):
    print(f"[DEBUG] Loading input file: {inputpath.resolve()}")  #DEBUG
    
    with inputpath.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    print(f"[DEBUG] Parsed JSON type: {type(data).__name__}")  #DEBUG

    if isinstance(data, list):
        print(f"[DEBUG] Detected list input with {len(data)} items")  #DEBUG
        return {"kind": "list", "payload": data}
    

    if isinstance(data, dict) and isinstance(data.get("results"), list):
        print(f"[DEBUG] Detected envelope input with {len(data.get('results', []))} results")  #DEBUG
        return {"kind": "envelope", "payload": data}
    
    raise ValueError("Inputted JSON must be a list or an object with results[]!")

def save_tagged_restaurants(outputpath: Path, restaurants):
    print(f"[DEBUG] Saving output to: {outputpath.resolve()}")  #DEBUG

    with outputpath.open("w", encoding="utf-8") as file:
        json.dump(restaurants, file, indent = 2, ensure_ascii = False)
    print("[DEBUG] Save complete")  #DEBUG



def normalize_item(item):
    d = item.get("result") or {}
    print(f"[DEBUG] Normalizing item: {item.get('restaurant_name', '<unknown>')}")  #DEBUG
    return {
        "name": item.get("restaurant_name", ""),
        "cuisine": d.get("genre", ""),
        "price_range": d.get("price_range", ""),
        "description": d.get("description", ""),
        "features": d.get("menu", []),
        "location_tag": item.get("location_tag", ""),
        "status": item.get("status", ""),
        "address": d.get("address", ""),
        "hours": d.get("hours", ""),
        "website": d.get("website", ""),
    }



def main():

    load_dotenv()
    print("[DEBUG] .env loaded via load_dotenv()")  #DEBUG

    parser = argparse.ArgumentParser()

    parser.add_argument(

        "--input",
        default = "restaurants.json",
    )

    parser.add_argument(

        "--output",
        default = "restaurants.json",
    )

    args = parser.parse_args()

    inputpath = Path(args.input)
    outputpath = Path(args.output)
    print(f"[DEBUG] Runtime args --input={inputpath} --output={outputpath}")  #DEBUG


    loaded = load_restaurants(inputpath)
    print(f"[DEBUG] Input kind selected: {loaded.get('kind')}")  #DEBUG

    if loaded["kind"] == "list":
        restaurants = loaded["payload"]
        print(f"[DEBUG] Tagging list mode: {len(restaurants)} restaurants")  #DEBUG
        tagged_restaurants = tag_restaurants(restaurants)
        save_tagged_restaurants(outputpath, tagged_restaurants)
        
        print(f"Tagged {len(tagged_restaurants)} restaurants")
        print(f"Done! Saved at {outputpath}")
        return

    #envelope

    envelope = loaded["payload"]
    results = envelope.get("results", [])
    print(f"[DEBUG] Tagging envelope mode: {len(results)} results")  #DEBUG

    normalized = [normalize_item(item) for item in results]
    print(f"[DEBUG] Normalized items count: {len(normalized)}")  #DEBUG
    tagged_normalized = tag_restaurants(normalized)
    print(f"[DEBUG] Received tagged normalized count: {len(tagged_normalized)}")  #DEBUG



    for i, tagged in enumerate(tagged_normalized):
        print(f"[DEBUG] Writing llm_tags for index {i}: {len(tagged.get('llm_tags', []))} tags")  #DEBUG
        results[i]["llm_tags"] = tagged.get("llm_tags", [])

    envelope["results"] = results
    save_tagged_restaurants(outputpath, envelope)

    print(f"Tagged {len(results)} restaurants")
    print(f"Done! Saved at {outputpath}")




if __name__ == "__main__":
    main()
