// App DM surfaces (spec blockkit.md §8): the App Home and the App Profile, for the conversation screen's Home and About
// pages (src/app/screens/conversation/AppPages.tsx). The 'app-profile' screen (push({ screen: 'app-profile', userId }))
// registers in ./register.ts.
export { AppHome, useAppHomeBlocks } from './AppHome'
export { AppProfile } from './AppProfile'
