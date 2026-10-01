import { AlertOverlay } from '../ui/Alert'
import { screenRect } from '../ui/Menu'
import { openOrToast } from '../shared'

// "Add channel" (spec home.md §4.9, channels-people.md §1.1; ConversationListHomePlugin.swift:539-569): an action sheet
// with "Create Channel" (create_channel_title, yaml:4960), "Browse Channels" (browse_channels, yaml:2612) and "Cancel"
// (cancel, yaml:3202) — frontline workers get no Create Channel (:562-564; not the demo's user) — presented from the row
// itself (sourceViewForPresentation), so on iOS 26 it's a popover by the row and Cancel is the tap outside.

export function AddChannelSheet({ sheetKey }: { sheetKey: string }) {
  const row = [...document.querySelectorAll('.ios-screen .sk-row')].find((el) => el.textContent?.trim() === 'Add channel')
  return (
    <AlertOverlay
      sheetKey={sheetKey}
      style="actionSheet"
      anchor={screenRect(row)}
      actions={[
        { title: 'Create Channel', onPress: () => openOrToast(['create-channel']) },
        { title: 'Browse Channels', onPress: () => openOrToast(['browse-channels', 'channel-browser']) },
        { title: 'Cancel', style: 'cancel' },
      ]}
    />
  )
}
