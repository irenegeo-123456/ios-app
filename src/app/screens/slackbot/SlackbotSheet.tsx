import { useApp } from '../../store'
import type { SheetProps } from '../../nav/registry'
import { SlackbotScreen } from './SlackbotScreen'
import './slackbot-sheet.css'

/** The Slackbot DM in a sheet: the same screen, its bar at the sheet's top (no status bar inside a sheet). */
export function SlackbotSheet({ sheetKey }: SheetProps) {
  const dismiss = () => useApp.getState().dismissSheet(sheetKey)
  return (
    <div className="slackbot-sheet">
      <SlackbotScreen onClose={dismiss} />
    </div>
  )
}
