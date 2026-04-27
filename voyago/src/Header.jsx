function Header({ currentPage }) {
  return (
    <header className={`site-header ${currentPage === 'swipe' ? 'site-header--solid' : ''}`}>
      <h1>Voyago</h1>
      <nav>
        <ul>
          <li>
            <a className={currentPage === 'home' ? 'active' : ''} href="#home">
              Home
            </a>
          </li>
          <li>
            <a className={currentPage === 'swipe' ? 'active' : ''} href="#swipe">
              Swipe Planner
            </a>
          </li>
          <li>
            <a href="#plan">Plan</a>
          </li>
          <li>
            <a href="#settings">Settings</a>
          </li>
        </ul>
      </nav>
    </header>
  )
}

export default Header

