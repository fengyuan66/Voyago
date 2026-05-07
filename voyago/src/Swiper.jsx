import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchFeed, submitRating } from "./recommendationApi";
import "./swiper.css";

const USER_ID = "demo-user";
const ANIMATION_SCROLLLOCK_MS = 420;
const PREFETCH_THRESHOLD = 3;
const PREFETCH_BATCH_SIZE = 10;

const cardVariants = {
  enter: (direction) => ({
    y: direction > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    y: direction > 0 ? -90 : 90,
    opacity: 0,
    scale: 0.97,
  }),
};

function getImageFallback(restaurant) {
  if (restaurant.imageUrl) {
    return restaurant.imageUrl;
  }
  return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80";
}

function Swiper() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingByCardId, setRatingByCardId] = useState({});
  const [profileSummary, setProfileSummary] = useState(null);
  const [insights, setInsights] = useState(null);

  const isAnimatingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const cardsRef = useRef(cards);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentPlace = cards[currentIndex];
  const totalCards = cards.length;

  const ratingButtons = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), []);

  async function loadMoreCards(limit = PREFETCH_BATCH_SIZE) {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      const excludeIds = cardsRef.current.map((restaurant) => restaurant.id);
      const payload = await fetchFeed({
        userId: USER_ID,
        limit,
        excludeIds,
      });
      const incoming = payload.items ?? [];
      const knownIds = new Set(cardsRef.current.map((restaurant) => restaurant.id));
      const unique = incoming.filter((restaurant) => !knownIds.has(restaurant.id));
      if (unique.length > 0) {
        setCards((previous) => [...previous, ...unique]);
      }
      if (payload.profileSummary) {
        setProfileSummary(payload.profileSummary);
      }
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to fetch recommendations.");
    } finally {
      isFetchingRef.current = false;
      setIsBootLoading(false);
    }
  }

  useEffect(() => {
    void loadMoreCards(PREFETCH_BATCH_SIZE);
  }, []);

  async function maybePrefetch(nextIndex) {
    const remaining = cardsRef.current.length - nextIndex - 1;
    if (remaining <= PREFETCH_THRESHOLD) {
      await loadMoreCards(PREFETCH_BATCH_SIZE);
    }
  }

  async function moveCard(dir) {
    if (cardsRef.current.length === 0) {
      return;
    }
    if (isAnimatingRef.current) {
      return;
    }
    isAnimatingRef.current = true;
    setDirection(dir);

    if (dir > 0) {
      let nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= cardsRef.current.length) {
        await loadMoreCards(6);
        nextIndex = currentIndexRef.current + 1;
      }
      if (nextIndex < cardsRef.current.length) {
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex;
        await maybePrefetch(nextIndex);
      }
    } else if (dir < 0) {
      const nextIndex = Math.max(0, currentIndexRef.current - 1);
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
    }

    setTimeout(() => {
      isAnimatingRef.current = false;
    }, ANIMATION_SCROLLLOCK_MS);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowDown") {
        void moveCard(1);
      }
      if (event.key === "ArrowUp") {
        void moveCard(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // This listener should only be registered once for the page session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRating(rating) {
    if (!currentPlace) {
      return;
    }
    setRatingByCardId((previous) => ({ ...previous, [currentPlace.id]: rating }));
    try {
      const payload = await submitRating({
        userId: USER_ID,
        restaurantId: currentPlace.id,
        rating,
      });
      if (payload.profileSummary) {
        setProfileSummary(payload.profileSummary);
      }
      if (payload.insights) {
        setInsights(payload.insights);
      }
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to submit rating.");
    }
  }

  if (isBootLoading && !currentPlace) {
    return <section className="swiper-page">Loading recommendations...</section>;
  }

  if (!currentPlace) {
    return (
      <section className="swiper-page">
        <p>No restaurants available yet.</p>
        <button type="button" onClick={() => void loadMoreCards(10)}>
          Retry feed
        </button>
      </section>
    );
  }

  return (
    <section
      className="swiper-page"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 10) {
          return;
        }
        void moveCard(event.deltaY > 0 ? 1 : -1);
      }}
    >
      <div className="swiper-meta">
        <span>
          Card {currentIndex + 1} / {Math.max(totalCards, 1)}
        </span>
        {error ? <span className="swiper-error">{error}</span> : null}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.article
          className="swiper-card"
          key={currentPlace.id}
          initial="enter"
          animate="center"
          exit="exit"
          variants={cardVariants}
          custom={direction}
          transition={{ duration: 0.35 }}
        >
          <img src={getImageFallback(currentPlace)} alt={currentPlace.name} className="swiper-image" />
          <div className="swiper-content">
            <h1>{currentPlace.name}</h1>
            <p>{currentPlace.description || "No description available."}</p>
            <p>
              <strong>Genre:</strong> {currentPlace.genre || "Unknown"}
            </p>
            <p>
              <strong>Price:</strong> {currentPlace.priceRange || "Unknown"}
            </p>
            <p>
              <strong>Address:</strong> {currentPlace.address || "Unknown"}
            </p>
            <p>
              <strong>Hours:</strong> {currentPlace.hours || "Unknown"}
            </p>
            <p>
              <strong>Top tags:</strong> {(currentPlace.tags || []).slice(0, 8).join(", ") || "None"}
            </p>
          </div>
        </motion.article>
      </AnimatePresence>

      <section className="rating-panel">
        <p>Rate this restaurant (1-10)</p>
        <div className="rating-grid">
          {ratingButtons.map((rating) => {
            const selected = ratingByCardId[currentPlace.id] === rating;
            return (
              <button
                key={rating}
                type="button"
                className={`rating-button ${selected ? "rating-button-selected" : ""}`}
                onClick={() => void handleRating(rating)}
              >
                {rating}
              </button>
            );
          })}
        </div>
      </section>

      {profileSummary ? (
        <section className="profile-panel">
          <h2>Learned Preferences</h2>
          <p>
            <strong>Liked:</strong>{" "}
            {profileSummary.liked?.map((entry) => entry.tag).join(", ") || "Not enough data yet"}
          </p>
          <p>
            <strong>Disliked:</strong>{" "}
            {profileSummary.disliked?.map((entry) => entry.tag).join(", ") || "Not enough data yet"}
          </p>
          {insights?.profile_summary ? (
            <p>
              <strong>Agent insight:</strong> {insights.profile_summary}
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

export default Swiper;
