import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './tokens/generated/colors.css'
import './tokens/type.css'
import './styles/hairline.css'
import './sim/sim.css'
import './slackkit/slackkit.css'
import './app/app.css'
import './app/nav/nav.css'
import { Simulator } from './sim/Simulator'
import { App } from './app/App'
import { KIT_PAGES } from './kit/pages'
import { initKitPanel, preparePrototype, protoSlug, startPrototype } from './kit/boot'
import './kit/pages/kit-pages.css'
import { ThemeStyle, useTheme } from './theme/ThemeStyle'
import { useApp } from './app/store'
import { useSim } from './sim/store'

// For tools and the console: drive the app from outside (tools/shot.mjs --eval, docs/conventions.md).
;(window as unknown as { slack: unknown }).slack = { app: useApp, sim: useSim, theme: useTheme }

const kit = new URLSearchParams(location.search).get('kit')
const page = kit ? KIT_PAGES[kit] : undefined
if (page) document.documentElement.dataset.kitPage = kit!

// A prototype (?proto=<slug>) replaces the workspace before the first render, then fills the panel after it.
initKitPanel()
if (!page && protoSlug()) await preparePrototype()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeStyle />
    {page ? (
      <Suspense fallback={null}>
        <page.component />
      </Suspense>
    ) : (
      <Simulator>
        <App />
      </Simulator>
    )}
  </StrictMode>,
)
if (!page && protoSlug()) requestAnimationFrame(() => void startPrototype())
else document.body.setAttribute('data-kit-ready', 'ready')
if (!page && new URLSearchParams(location.search).has('selftest')) setTimeout(() => void import('./kit/selftest').then((m) => m.runSelftest()), 800)
