//Vallaha caller

export async function getRoute(data){
    const res = await fetch("http://127.0.0.1:8000/route", { //CHANGE IN DEPLOYMENT
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    })

    return res.json();

};