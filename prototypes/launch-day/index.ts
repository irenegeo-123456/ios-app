import { definePrototype } from '../../src/kit'

// A demo-day walkthrough on the Northstar workspace: messages land live while you present, with typing first and
// badges updating on Home, DMs and Activity.

export default definePrototype({
  title: 'Launch day',
  description: 'Northstar on Atlas launch day: a DM, a mention and a deploy land while you present.',
  author: 'Slack Design',
  updated: '2026-09-30',
  tags: ['demo', 'scenes'],

  start: { tab: 'home' },

  scenes: [
    { label: 'Priya DMs you', post: { to: '@priya', from: 'priya', text: 'Launch checklist is at 90% :tada: Can you give pricing copy a final look before 3pm?' } },
    {
      label: 'Marcus mentions you in #engineering',
      post: { to: '#engineering', from: 'marcus', text: '<@me> search indexer is merged and deploying now :rocket: Thanks for the quick review!' },
    },
    { label: 'Open #launch-atlas', go: '#launch-atlas' },
    { label: 'Hannah posts in #launch-atlas', post: { to: '#launch-atlas', from: 'hannah', text: 'Press release is *approved* :white_check_mark: Going out at 9am PT tomorrow.' } },
    {
      label: 'Everyone reacts',
      run: async (kit) => {
        kit.toast('The team is excited')
        await kit.wait(300)
      },
    },
  ],
})
