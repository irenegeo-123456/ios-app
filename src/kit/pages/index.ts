import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Pages outside the simulator, at ?kit=<name>: the component gallery, the prototype gallery, the icon browser.
// Each loads on demand.

export const KIT_PAGES: Record<string, { title: string; component: LazyExoticComponent<ComponentType> }> = {
  prototypes: { title: 'Prototypes', component: lazy(() => import('./PrototypesGallery')) },
  components: { title: 'SlackKit components', component: lazy(() => import('./ComponentsGallery')) },
  icons: { title: 'Icons', component: lazy(() => import('./IconsPage')) },
  assets: { title: 'Assets', component: lazy(() => import('./AssetsPage')) },
  blocks: { title: 'Block Kit', component: lazy(() => import('./BlocksGallery')) },
}
