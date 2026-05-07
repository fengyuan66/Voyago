const HQ_KEY = "voyago.hq";

export function getHQ(){

    const raw = localStorage.getItem(HQ_KEY);
    return raw ? JSON.parse(raw) : null;
}

export function saveHQ(hq) {
    localStorage.setItem(HQ_KEY, JSON.stringify(hq));
}