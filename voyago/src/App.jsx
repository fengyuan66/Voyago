import './App.css'

import Header from './Header'
import Footer from './Footer'
import Hero from './Hero'
import Destinations from './Destinations'
import HeroTransition from './HeroTransition'
import SwipePlanner from './SwipePlanner'
import { useEffect, useState } from 'react'

const HOME_HASH = '#home'
const SWIPE_HASH = '#swipe'

function getPageFromHash(hash) {
  if (hash === SWIPE_HASH) {
    return 'swipe'
  }
  return 'home'
}

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = HOME_HASH
    }

    const onHashChange = () => {
      setCurrentPage(getPageFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isSwipePage = currentPage === 'swipe'

  return (
    <>
      <Header currentPage={currentPage} />
      {isSwipePage ? (
        <SwipePlanner />
      ) : (
        <>
          <Hero />
          <HeroTransition />
          <Destinations />
        </>
      )}
      <Footer />
    </>
  )
}

export default App
