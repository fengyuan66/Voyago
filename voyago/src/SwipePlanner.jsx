import { useCallback, useEffect, useRef, useState } from 'react'
import { fallbackPlaces } from './data/fallbackPlaces'
import { loadPlacesFromCsv } from './utils/loadPlacesFromCsv'
import './swipe-planner.css'

function SwipePlanner() {
  const [places, setPlaces] = useState(fallbackPlaces)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratings, setRatings] = useState({})
  const [itinerary, setItinerary] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const lastWheelAt = useRef(0)

  useEffect(() => {
    let isMounted = true

    const readCsv = async () => {
      try {
        const csvPlaces = await loadPlacesFromCsv('/data/places.csv')
        if (!isMounted) {
          return
        }
        if (csvPlaces.length > 0) {
          setPlaces(csvPlaces)
          setCurrentIndex(0)
          return
        }
        setLoadError('CSV loaded but had no rows. Showing fallback places for now.')
      } catch {
        if (!isMounted) {
          return
        }
        setLoadError('Could not read places.csv, so fallback places are shown.')
      }
    }

    readCsv()
    return () => {
      isMounted = false
    }
  }, [])

  const moveCard = useCallback(
    (direction) => {
      if (places.length === 0) {
        return
      }

      setCurrentIndex((previousIndex) => {
        const nextIndex = previousIndex + direction
        if (nextIndex < 0) {
          return places.length - 1
        }
        if (nextIndex >= places.length) {
          return 0
        }
        return nextIndex
      })
    },
    [places.length],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        moveCard(1)
      }
      if (event.key === 'ArrowUp') {
        moveCard(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moveCard])

  const handleWheel = (event) => {
    const now = Date.now()
    if (now - lastWheelAt.current < 250) {
      return
    }

    if (Math.abs(event.deltaY) > 8) {
      moveCard(event.deltaY > 0 ? 1 : -1)
      lastWheelAt.current = now
    }
  }

  const currentPlace = places[currentIndex]
  const currentRating = currentPlace ? ratings[currentPlace.id] : null

  const handleRate = (score) => {
    if (!currentPlace) {
      return
    }

    setRatings((previousRatings) => ({
      ...previousRatings,
      [currentPlace.id]: score,
    }))

    if (score >= 9) {
      setStatusMessage('Great pick. This place can now be added to your itinerary cart.')
      return
    }

    setStatusMessage('')
  }

  const handleAddToItinerary = () => {
    if (!currentPlace) {
      return
    }

    const ratingForCurrentPlace = ratings[currentPlace.id]
    if (!ratingForCurrentPlace || ratingForCurrentPlace < 9) {
      setStatusMessage('Rate this place 9 or 10 first, then it can be added to your cart.')
      return
    }

    setItinerary((previousItinerary) => {
      const alreadyInCart = previousItinerary.some((place) => place.id === currentPlace.id)
      if (alreadyInCart) {
        setStatusMessage('This place is already in your itinerary cart.')
        return previousItinerary
      }

      setStatusMessage('Added to itinerary cart.')
      return [...previousItinerary, currentPlace]
    })
  }

  if (!currentPlace) {
    return (
      <section className="swipe-planner">
        <p>No places to display yet.</p>
      </section>
    )
  }

  return (
    <section className="swipe-planner" onWheel={handleWheel}>
      <div className="swipe-layout">
        <article className="place-card">
          <div className="place-image-wrap">
            <img src={currentPlace.imageUrl} alt={currentPlace.name} />
          </div>

          <div className="place-content">
            <p className="place-eyebrow">
              {currentIndex + 1} / {places.length}
            </p>
            <h2>{currentPlace.name}</h2>
            <p className="place-description">{currentPlace.description}</p>

            <div className="place-meta">
              <p>
                <strong>Country:</strong> {currentPlace.country}
              </p>
              <p>
                <strong>Best season:</strong> {currentPlace.bestSeason}
              </p>
              <p>
                <strong>Budget:</strong> {currentPlace.budgetLevel}
              </p>
              <p>
                <strong>Avg/day:</strong> ${currentPlace.avgDailyCost}
              </p>
              <p>
                <strong>Suggested days:</strong> {currentPlace.daysSuggested}
              </p>
            </div>

            <div className="rating-block">
              <p>Rate this place (1 to 10)</p>
              <div className="rating-row">
                {Array.from({ length: 10 }, (_, index) => {
                  const score = index + 1
                  return (
                    <button
                      key={score}
                      className={score === currentRating ? 'rating-btn selected' : 'rating-btn'}
                      onClick={() => handleRate(score)}
                      type="button"
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card-actions">
              <button className="ghost-btn" onClick={() => moveCard(-1)} type="button">
                Previous
              </button>
              <button className="ghost-btn" onClick={() => moveCard(1)} type="button">
                Next
              </button>
              <button className="cart-btn" onClick={handleAddToItinerary} type="button">
                Super Satisfied? Add to Itinerary
              </button>
            </div>

            <p className="swipe-help">Tip: use mouse wheel or Arrow Up/Arrow Down to move cards.</p>
            {loadError && <p className="load-note">{loadError}</p>}
            {statusMessage && <p className="status-note">{statusMessage}</p>}
          </div>
        </article>

        <aside className="itinerary-cart">
          <h3>Itinerary Cart ({itinerary.length})</h3>
          {itinerary.length === 0 ? (
            <p>Rate a place 9 or 10, then add it here.</p>
          ) : (
            <ul>
              {itinerary.map((place) => (
                <li key={place.id}>
                  <span>{place.name}</span>
                  <span>{ratings[place.id]}/10</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  )
}

export default SwipePlanner
