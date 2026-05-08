import './App.css'

import LandingPage from './LandingPage'

import Header from './Header'
import Footer from './Footer'
import Swiper from './Swiper'

import { Routes, Route } from 'react-router-dom'
import SettingsPage from './Settings'




function App() {
 

  return (
    <>
      <Header/>
      {/*Adding routings for sub-webpages*/}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/swipe" element={<Swiper />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      
      <Footer />
    </>
  )
}

export default App
