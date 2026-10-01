import { defineApp, type AppDefinition } from '../apps/kit'
import { appIcon } from './assets'
import type { Prototype } from './prototype'

// Slack's Salesforce sidebar section (`sidebar: { salesforce: … }`) always lists the Salesforce app first
// (channel-sidebar/utility/channel-section-channels-filter.ts:129). A prototype that doesn't bring its own app with
// the id 'salesforce' gets this one. To give it a Home tab or handlers, build on it:
//   apps: [defineApp({ ...salesforceApp, home: [bk.header('Pipeline')] })]

export const salesforceApp = defineApp({
  id: 'salesforce',
  name: 'Salesforce',
  icon: appIcon('salesforce'),
  description: 'Salesforce records, alerts and workflows in Slack',
  about: {
    description: 'Work with Salesforce records in Slack, and get messages from workflows that use Salesforce.',
    features: ['Messages from Workflow Builder workflows that use Salesforce', 'Record previews and list views'],
    developer: 'Salesforce',
  },
})

/** The apps to register for a prototype: its own, plus `salesforceApp` when its sidebar has the Salesforce section. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prototypeApps(proto: Prototype): AppDefinition<any>[] {
  const apps = proto.apps ?? []
  return proto.sidebar?.salesforce && !apps.some((a) => a.id === salesforceApp.id) ? [...apps, salesforceApp] : apps
}
