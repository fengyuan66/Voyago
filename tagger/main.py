import json

from pathlib import Path

from dotenv import load_dotenv

import argparse

from tagger import tag_restaurants

def load_restaurants(inputpath: Path):
    
    with inputpath.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)

    if isinstance(data, list):
        return {"kind": "list", "payload": data}
    

    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return {"kind": "envelope", "payload": data}
    
    raise ValueError("Inputted JSON must be a list or an object with results[]!")

def save_tagged_restaurants(outputpath: Path, restaurants):

    with outputpath.open("w", encoding="utf-8") as file:
        json.dump(restaurants, file, indent = 2, ensure_ascii = False)



def normalize_item(item):
    d = item.get("result") or {}
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


    loaded = load_restaurants(inputpath)

    if loaded["kind"] == "list":
        restaurants = loaded["payload"]
        tagged_restaurants = tag_restaurants(restaurants)
        save_tagged_restaurants(outputpath, tagged_restaurants)
        
        print(f"Tagged {len(tagged_restaurants)} restaurants")
        print(f"Done! Saved at {outputpath}")
        return

    #envelope

    envelope = loaded["payload"]
    results = envelope.get("results", [])

    normalized = [normalize_item(item) for item in results]
    tagged_normalized = tag_restaurants(normalized)



    for i, tagged in enumerate(tagged_normalized):
        results[i]["llm_tags"] = tagged.get("llm_tags", [])

    envelope["results"] = results
    save_tagged_restaurants(outputpath, envelope)

    print(f"Tagged {len(results)} restaurants")
    print(f"Done! Saved at {outputpath}")




if __name__ == "__main__":
    main()