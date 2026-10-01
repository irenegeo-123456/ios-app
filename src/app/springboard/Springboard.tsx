import { useEffect } from 'react'
import { useApp } from '../store'
import { useScreenChrome } from '../../sim/screen'
import { asset } from '../../lib/asset'

// The Home Screen, shown when you press Home (the title bar button, ⇧⌘H, or the SE's home button). Tap Slack to
// come back; the app keeps its state, as a backgrounded iOS app does.

export function HomeScreenOverlay() {
  const foreground = useApp((s) => s.foreground)
  const setForeground = useApp((s) => s.setForeground)
  const setGoHome = useScreenChrome((s) => s.setGoHome)

  useEffect(() => {
    setGoHome(() => useApp.getState().setForeground(!useApp.getState().foreground ? true : false))
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        useApp.getState().setForeground(!useApp.getState().foreground)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setGoHome])

  useEffect(() => {
    document.querySelector('.ios-app')?.classList.toggle('is-backgrounded', !foreground)
  }, [foreground])

  return (
    <div className={`ios-springboard${foreground ? '' : ' is-visible'}`} aria-hidden={foreground}>
      <div className="ios-springboard__grid">
        <button type="button" className="ios-springboard__app" onClick={() => setForeground(true)}>
          <img src={asset('/ios/app-icon-180.png')} alt="" />
          <span>Slack</span>
        </button>
      </div>
      <div className="ios-springboard__dock">
        <button type="button" className="ios-springboard__app ios-springboard__app--dock" onClick={() => setForeground(true)}>
          <img src={asset('/ios/app-icon-180.png')} alt="" />
        </button>
      </div>
    </div>
  )
}
