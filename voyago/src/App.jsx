import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

import './App.css'

import Header from './Header'
import Footer from './Footer'
import Hero from './Hero'
import Destinations from './Destinations'
import HeroTransition from './HeroTransition'

function App() {

  return(
    <>
    <Header/>
    <Hero/>
    <HeroTransition/>
    <Destinations/>
    <Footer/>
    
    </>
  )
  
}

export default App
