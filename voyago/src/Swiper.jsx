function Swiper(){

    const places = [

        {
            id: 'test1',
            name: 'Krusty Krabs',
            location: '305125, 305125',
            description: 'The best place to get a Krabby Patty',
            address: '123 Ocean Avenue, Bikini Bottom',
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/The_Krusty_Krab.png/330px-The_Krusty_Krab.png'
        },

        {
            id: 'test2',
            name: 'Hitlers Bunker',
            location: '888888, 888888',
            description: 'Hitlers Super Secret Den where he committed all his crimes and plotted world domination and also where he hid all his gold and suicide when papa Stalin is coming for him',
            address: '8888 Nazi Road, Berlin, Germany',
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bundesarchiv_Bild_183-V04744%2C_Berlin%2C_Garten_der_zerst%C3%B6rte_Reichskanzlei.jpg/330px-Bundesarchiv_Bild_183-V04744%2C_Berlin%2C_Garten_der_zerst%C3%B6rte_Reichskanzlei.jpg'
        },

        {
            id: 'test3',
            name: 'The One Piece',
            location: '6969796767, 6969796767',
            description: 'THE ONE PIECE!!11!! THE ONE PIECE IS REAL',
            address: 'idk lmao',
            imageUrl: 'https://wallpapers.com/images/featured/one-piece-iphone-6cakwu3a3exyh3p3.jpg'
        }

    ]

    const currentPlace = places[0]

    


    return (

        <section style={{ padding: '6rem 1rem'}}>

            <article style={{ maxWidth: '700px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden'}}>
                <img src= {currentPlace.imageUrl} style= {{width: '100%', height: '340px', objectFit: 'cover'}} />
                <div style= {{padding: '1rem'}}>

                    <h1>{currentPlace.name}</h1>
                    <p>{currentPlace.description}</p>
                    <p><strong>Address: </strong>{currentPlace.address}</p>
                    <p><strong>Location: </strong>{currentPlace.location}</p>

                </div>
            </article>

        </section>

    )


    

}

export default Swiper