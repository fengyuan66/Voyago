import json

from pathlib import Path

from dotenv import load_lotenv

from tagger import tag_restaurants

def load_restaurants(inputpath: Path):
    
    with inputpath.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError("Input JSON must be list of restaurants")
    
    return data

def save_tagged_restaurants(outputpath: Path, restaurants):

    with outputpath.open("w", encoding="utf-8") as file:
        json.dump(restaurants, file, indent = 2, ensure_ascii = False)


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

    restaurants = load_restaurants(inputpath)
    tagged_restaurants = tag_restaurants(restaurants)
    save_tagged_restaurants(outputpath, tagged_restaurants)

    print(f"Tagged {len(tagged_restaurants)} restaurants")
    print(f"Done! Saved at {outputpath}")


if __name__ == "__main__":
    main()