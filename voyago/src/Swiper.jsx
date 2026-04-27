//imports

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const ANIMATION_SCROLLLOCK_MS = 420 //Duration to lock scrolling during one animation, in miliseconds

const cardVariants = {

    //Initial position of the incoming card
    enter: (direction) => ({
        y: direction > 0 ? 90: -90,
        opacity: 0,
        scale: 0.97,
    }),

    //Final resting position of the current card
    center: {
        y: 0,
        opacity: 1,
        scale: 1,
    },

    //Exit position of the outgoing card
    exit: (direction) => ({
        y: direction >0 ? -90:90,
        opacity:0,
        scale: 0.97,
    }),

    //Kinda like Capcut animations lmao
}



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

    const [currentIndex, setCurrentIndex] = useState(0) //current card, which one is it?
    const [direction, setDirection] = useState(1) //current movement direction
    const isAnimatingRef = useRef(false) //prevents multiple scrolls during animation

    const currentPlace = places[currentIndex] //current card OBJECT






    //THE FOLLOWING PART IS GENERATED USING AI, IM TOO TIRED FOR THIS TEDIOUS ANIMATION SHIT

        // Helper to move between cards in either direction.
    const moveCard = (dir) => {
        // If animation is running, ignore new input.
        if (isAnimatingRef.current) return

        // Lock interaction until animation finishes.
        isAnimatingRef.current = true

        // Save direction so animation knows which way to slide.
        setDirection(dir)

        // Update index with wrap-around.
        setCurrentIndex((prev) => {
        const next = prev + dir
        if (next < 0) return places.length - 1
        if (next >= places.length) return 0
        return next
        })

        // Unlock after animation window.
        setTimeout(() => {
        isAnimatingRef.current = false
        }, ANIMATION_SCROLLLOCK_MS)
    }

    // Add keyboard support: ArrowDown / ArrowUp.
    useEffect(() => {
        const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') moveCard(1)
        if (event.key === 'ArrowUp') moveCard(-1)
        }

        // Register event listener when component mounts.
        window.addEventListener('keydown', onKeyDown)

        // Cleanup listener when component unmounts.
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])


// AI PART ENDS HERE



//MAIN PART LMAO FUCK THIS ANIMATION SHIT
    return (

        <section
        style={{ padding: '6rem 1rem' }}
        onWheel={(event) => {
            // Trackpad noise filter
            if (Math.abs(event.deltaY) < 10) return

            // scroll down = next card, scroll up = previous card
            moveCard(event.deltaY > 0 ? 1 : -1)
        }}
        >

            
            <AnimatePresence mode="wait" //allows Framer Motion to run exit/ enter animations when the element changes
            
            custom={direction} //Same lah, but for coordination between new/old key'ed elements
            > 

                <motion.article style={{ maxWidth: '700px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden'}}
                key={currentPlace.id} //tells React that each card is a different new instance when the place changes. This distinguish is needed for the animations. Otherwise the DOM may be reused, so the old card just stays instead of gets destroyed / new animation won't load / be done in parallel
                initial="enter" //When a new card appears, use the "enter" variant as the initial state
                animate="center" //When the card is in view, use the "center" variant
                exit="exit" //When the card is leaving, use the "exit" variant

                variants={cardVariants} //Connects the initial, animate, exit variants with the actual animation definitions wrote in cardVariants
                custom={direction} //Passes the direction (1 or -1 for scrolling up/down) to the variants, so they know which way to animate
                




                transition={{ duration: 0.35}} //SETTING: DURATION OF ANIMATION



                >
                    <img src= {currentPlace.imageUrl} style= {{width: '100%', height: '340px', objectFit: 'cover'}} />
                    <div style= {{padding: '1rem'}}>

                        <h1>{currentPlace.name}</h1>
                        <p>{currentPlace.description}</p>
                        <p><strong>Address: </strong>{currentPlace.address}</p>
                        <p><strong>Location: </strong>{currentPlace.location}</p>

                    </div>
                </motion.article>

            </AnimatePresence>

        </section>

    )


    

}

export default Swiper