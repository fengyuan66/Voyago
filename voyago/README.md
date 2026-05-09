# Voyago README


# What is this?

For now: A multi-agent system that learns your restaurant preferences through doomscrolling, and recommends you more restaurants!
(+ the data extraction pipeline needed to collect the dataset it needs)

In the future: A more agent-oriented agenetic system that will learn not only on restaurants, but about your opinion on certain attractions, attendable events, etc via doomscrolling. It will then help you build a trip itinerary by recommending you places / events you may enjoy.

# Background

The problem with planning a trip these days is that when you search up “things to do / eat in Vancouver”, it is always the same things that rise to the surface of your search engine. In reality, as a Vancouver resident myself, I can confirm that I’ve had far richer experiences at places which are hardly reachable by search engine unless if you dig vigorously. This is a problem because it demonstrates that only the top few percentile of places or establishments get the vast majority of attention, and becomes the "must-go meta" for most travellers. Voyago aims to fix this by giving equal exposure to more niche places and asking what *you* like... and what better way to consume large amounts of content than via doomscrolling?!


Ultimately, the question comes down to what “motivates one’s happiness”. I want to build a personal agentic AI tour guide who will help you plan your itinerary. The way it does it is to 1. Learn about what is there to do in the city and what about them (places, events, restaurants, etc) 2. Learn and potentially reason about what specific factors “motivate your happiness”, 3. Thus, recommend places for you to go.


This is quite an ambitious project that I will continue, and it has a lot of features I have to add to accurately model the constraints someone may have when planning their travels.

Currently, the fully processed dataset is limited to restaurants within Vancouver. The demo version contains 47 locations total. This is mainly a proof of concept, but it does work as intended and it demonstrates how, if we're able to process more data of say, attractions, we're able to easily integrate it into this system.

But I guess for now it's of some use. I have very strong deciphobia about where to eat and will often spend such a long time walking around, looking at maps, and carefully analysing the menus at the food court, only to resort to McDonalds (the default safe option) in the end


# What it does (currently):


1. You tell Voyago where you’re staying at / your location (limited to Vancouver for now)
2. Voyago gives you a list of restaurants, presented in a reels-like format. It tells you the following things for every restaurant:
- Genre (cuisine type)
- Price range for full meal
- Address
- Operating hours
- Top tags associated with the restaurant
- The rough route + estimated time for you to either walk or drive there


3. For every restaurant, you can read the description and rate it out of 10 based on how much you like it
4. As you rate more and more, Voyago will use the numerical input you give to weigh which tags you like and which ones you do not.
5. Once enough tags are accumulated, the LLM will occasionally generate a summary of your preferences
6. Voyago will gradually reduce the likelihood of restaurants containing tags that already have very strong pro / anti signals, and vice versa for those with tags that are not frequently rated.
7. As you scroll, you can click "AI recommendation" button on the left side panel to let the agent pick out restaurants that you may enjoy, according to what Voyago has learned about your preferences


# File structure / Pipeline

This whole thing is a pipeline! For now, Voyago and Transiter are the two directories with user-facing content. The Tagger and Leads Extractor (along with my RRAG system) are a system for collecting data at scale which I can operate to build / update the database of locations.

In the order of which section runs first:

**1. leadsExtractor**


leadsExtractor scrapes a basic list of restaurant names within a periphery and their respective addresses, formatting them into csv.

(there are other things it collects, but they were super unstable. This was initially supposed to the current R-RAG component, but the Google Earth-oriented scraping was very unpredictable and the only two things it could collect efficiently are the place names and addresses, but that's okay since those alone will be able to reduce the burden on R-RAG)


**2. (EXTERNAL) Restaurant-RAG**


My other project, RRAG (https://game.hackclub.com/projects/2020), uses agentic LLM to intake a list of restaurants from the CSV leadsExtractor produced. It uses RAG to do do futher research and provide a list of enriched info for each restaurant. RRAG outputs the results as a JSON format


**3. Tagger** (/Tagger)


Given a list of tags, an LLM is used to inspect the info from RRAG's output JSON, and add one more field where the LLM appends the tags it thinks is appropriate for the restaurant to the restaurant. This will be the final "database" that Voyago receives.

I used Hack Club AI API here

**Steps prior to this point have been about the data extraction of the pipeline, steps after this point is the actual site**


**4. Voyago** (/voyago)


This is the Voyago site. The React frontend displays LLM services + Transiter running simultaneously in the backend. Essentially,


1. you head to "Settings" to input an HQ (where you will be staying at for the duration of your trip).
2. You head to "Scroll" (name within repo is Swiper) to doomscroll through the database of restaurants. For each restaurant, you rate the restaurants out of 10, which then gets normalized into a 0-1 value and increases / decreases the user's "preference" score to tags associated with the restaurant.


Each restaurant will then receive a restaurant score based on the average of the tags associated with them. This score will determine the priority of restaurants showing up in the feed. Notably, a restaurant with tags that have few ratings get a bonus in their restaurant score, and a restaurant with tags that was scored excessively will get their restaurant score bumped down by a little. The extent of this boost/punishment is scaled by the number of times the specific tag has been recommended out of the most recent 20 rated restaurants (see voyago/backend/recommender.js for details). This means that tags that are not explicitly scored negatively will not be hindered to a point where it won't show up on feed.

**5. Transiter** (/transiter)

A mini-system that uses Valhalla routing engine (https://github.com/valhalla/valhalla) with Open Street Map tiles to estimate how long it takes for you to go from your HQ to the restaurant. I initially wanted to make it predict public transit times with Translink (Vancouver public transport provider)'s frequently updated feeds, but debugging it took way too long... so driving / walking is good enough for now.

The system is embedded in each of the restaurant cards in the scroll page.

 
# How voyago suggestions backend works (basically)

The signals distinguishing between "like" and "dislike" are separated into two types: alpha and beta. Each tag has their own alpha and beta values, and they both start at 3 to demonstrate initial neutrality

When you begin scrolling and scoring, the system measures each restaurant on a few key ideas:

1. Preference (does this restaurant have the tags the user likes?)
2. Uncertainty (Is the app still unsure about whether a certain type of food / tag is favoured? Maybe show the user it to learn more)
3. Is this tag barely shown? (If so give it a small boost, as mentioned previously)
4. Has this tag been shown repeatedly (vice versa to barely shown)

Currently, many tags are associated with "parent categories" (e.g., Sushi with Asian). This is done so that when lets say Sushi gets high praise, Voyago will also increase the alpha signals for Asian food. This is for now a static system. In the future I want to use an LLM to be able to associate between tags semantically, so we don't have to explicitly define which tags are associated with what parent group.

** Current LLM augmentation **

1. Profile summary

Once you have at least 6 ratings, the AI creates a 4-5 sentence summarised insight for your preferences every 5 ratings you complete. This allows the system to gain an overall understanding of your taste.

2. AI recommendations

Taking in a compacted version of the top liked/disliked tags and the profile summary, the app selects from a shortlist of unjudged places restaurants to recommend the user based on their current likings.



Overall the system is oriented around static systems, using generative LLMs as support. I like this for now because it is stable and truth be told I'm already submitting this late enough. For the long term though I'd like to see if I could make the agent framework more generative-oriented by making more steps be based on the LLM's choice. It will get unpreditable, but if successful it'd be able to achieve more personal recommendations in a way that a lot of sites currently do not accomplish

# How this could be used

As mentioned, this is mainly a proof-of-concept that demonstrates completely how the system could work with one specific type of place (restaurants). For now it could address my deciphobia when choosing restaurants, but in the long term I can adapt this system to datasets of parks, attractions, attendable events, etc to build a more complete travel / exploring agent partner.


# AI declaration

The main tool I used for this project is Codex in my VSCode editor. I use Codex because it is able to have full context of my project directory and structure. I think there are 4 significant places where AI was used:

Debugging / fixing issues

During development a lot of issues happened. Most “big” issues were with performance. For example, the model would sometimes hallucinate info or generate results that were not satisfactorily aligned with the schema. Codex was very helpful sometimes in being able to analyse what was wrong with my project and help explain what these big performance issues are. For instance, the validation during the “AI recommendation” feature where recommended restaurants are filtered to check if it is actually legit or hallucinated was one such policy suggested by AI

In addition, as the system became more and more complex, finding the trace of problems was difficult. AI helped me generate a lot of debugging statements that exposed what was either wrong or not ideal (causing generative parts to become unstable).

Demo deployment

Except for the user-facing parts (Voyago-VD), which was designed to be presentable, I used AI to generate a wrapper for the previously CLI-based components that was not convenient for demos (Voyago-PV), purely for the purpose of showing for the demo and thus is located in a separate repo. AI also helped me a lot in terms of discovering which platforms I can deploy through. Due to the presence of both a front end and a backend and a 1.5GB pbf openstreetmap file, I initially was recommended to use Oracle, but AI said that I could use the Supabase-Render-Vercel stack I am using now

3. Parsing

Same as my previous project, I’d rather be more concerned with the overall strategy of my project rather than parsing files. There are instances when I used AI to implement particular parsing logics.

4. Incident recovery

On May 7th I messed up bigtime when working with Transiter minimap integration. Essentially I tried to revert back to a previous commit, but through it I somehow ended up with a lot of my Openstreet Map tile files built at different times being stashed. So when I tried to go and fix the transiter minimap over and over again nothing worked because the tiles were stashed and mashed up. AI helped me a lot in recovering my project to a stable state, especially when it came to Github actions and conflict resolution


AI is not used to write this README!!

Overall I believe that, considering the complexity of this project, mainly in size, and unpredictability of data processing, I used AI meaningfully and in dealing with places where I am truly stuck. The usage of AI in the project did not impact my comprehension over my own codebase and so uhh all in all I think this is not AI slop that the AI regulation is intended to tackle.


# DEMO / how to test it:


Here is the demo hub! Please read the instructions in them for assistance: https://docs.google.com/document/d/1ATQCNs4iA9GmtCfzy3Zy8waQqAyNNWDVDrxhREHo9P4/edit?usp=sharing


Here is a brief video demo, alternatively:





# How other people (or me!!) can contribute to it?

The current system is limited to restaurants, and I intend to extend it to attractions, events, etc. However, the data -> doomscroll -> learn preference pipeline can be adapted to many different things, like shops, plans (AI continuously generates a plan, and you give it feedback in some form for it to learn and generate a better plan), etc.

Also, the LLM in my current system is meant to act like an agent, but instead of it controlling the tools, it relies on the tools (user preference scoring algorithm). I think a more experimental, complex, and credit-consuming design would be to have the majority of the interpretation and recommendation done by LLM roles rather than more numerical systems (to make it more agent-oriented). Doing so would, however, be a lot more expensive considering the amount of input / output tokens. If this thing can get some attention and people start subscribing to use a more superior agent-oriented system, maybe that could work.

