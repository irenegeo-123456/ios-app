import { Fragment } from 'react'
import { useApp } from '../store'
import { useSheet } from '../nav/SheetHost'
import { Icon } from '../../icons/Icon'
import { SKListHeader } from '../../slackkit/SKEntity'
import { EntityRow } from '../screens/more/EntityRow'
import { useHuddle, useMyRoom } from './state'
import { toggleCaptions, toggleNotes, toggleScreen, toggleSelfView } from './actions'
import './huddle.css'

// The huddle's More menu (spec search-slackbot-huddles.md §3.7; HuddleActionButtonMenuBuilder.swift:61-140,
// HuddlesMenuOption+Presentation.swift:19-278, HuddlesMenuFeature.swift:32-64, HuddlesMenuViewController.swift:15-45):
// a self-sized sheet with a grabber, 20 pt of top inset, an entity list on basePrimary; sections "More Options" and
// "Audio & Video" with medium headers, then Share Feedback, 8 pt between sections; every row an SKGenericEntity .small
// with a 24 pt icon ornament in contentPrimary. Picking a row dismisses the sheet, then acts (HuddlesMenuFeature.handle).

interface Row {
  icon: string
  title: string
  /** selected toggles draw their title bold (isBold, :234-244) */
  bold?: boolean
  run: () => void
}

const notInPrototype = () => useApp.getState().showToast('Not in the prototype')

export function HuddleMoreSheet() {
  const sheet = useSheet()
  const room = useMyRoom()
  const mine = useHuddle((s) => s.mine)
  if (!room || !mine) return <div className="huddle-more" />
  const sections: { name?: string; rows: Row[] }[] = [
    {
      name: 'More Options', // more_options
      rows: [
        { icon: 'user_add', title: 'Invite People', run: notInPrototype }, // invite_people
        { icon: 'edit', title: 'Edit Topic', run: notInPrototype }, // huddles_edit_topic
        { icon: 'image', title: 'Edit Theme', run: notInPrototype }, // huddles_edit_background_theme
        { icon: 'canvas_content', title: 'Take Notes', run: notInPrototype }, // take_notes
        { icon: 'link', title: 'Copy Huddle Link', run: () => useApp.getState().showToast('Link copied') }, // copy_huddle_link_context_menu, link_copied
        // toggleRecording: svgAiSummary / svgAiSummaryOff (:192), menuToggle start / stop titles (HuddlesRecordingType+Strings.swift:12-25)
        // selected options are bold: shareScreen, toggleCaptions, toggleSelfView, toggleRecording (HuddlesMenuOption+Presentation.swift:236-252)
        room.notes
          ? { icon: 'ai_summary_off', title: 'Stop AI Notes & Transcription', bold: true, run: toggleNotes }
          : { icon: 'ai_summary', title: 'Start AI Notes & Transcription', run: toggleNotes },
        ...(room.notes ? [{ icon: 'globe', title: 'Huddle Language', run: notInPrototype }] : []), // huddle_language_title
      ],
    },
    {
      name: 'Audio & Video', // audio_and_video
      rows: [
        { icon: 'settings', title: 'Audio Preferences', run: notInPrototype }, // audioPreferences
        { icon: mine.screen ? 'screen_share' : 'screen', title: mine.screen ? 'Stop Screen Share' : 'Share Screen', bold: mine.screen, run: toggleScreen }, // huddle_stop_screen_share / huddle_share_screen
        {
          icon: mine.captions ? 'closed_caption_filled' : 'closed_caption',
          title: mine.captions ? 'Turn Off Captions' : 'Turn On Captions', // huddles_turn_off_closed_caption / huddles_turn_on_closed_caption
          bold: mine.captions,
          run: toggleCaptions,
        },
        // toggleSelfView(selected): svgEyeOpenFilled / svgEyeClosed, huddle_show_self_view / huddle_hide_self_view (:178, :215)
        mine.selfViewHidden ? { icon: 'eye_open_filled', title: 'Show Self View', bold: true, run: toggleSelfView } : { icon: 'eye_closed', title: 'Hide Self View', run: toggleSelfView },
      ],
    },
    { rows: [{ icon: 'share_feedback', title: 'Share Feedback', run: notInPrototype }] }, // share_feedback
  ]
  return (
    <div className="huddle-more" data-qa="huddle_more">
      {sections.map((sec, i) => (
        <Fragment key={i}>
          {i > 0 && <div style={{ height: 8 }} aria-hidden />}
          {sec.name && <SKListHeader title={sec.name} collapsible={false} className="huddle-more__header" />}
          {sec.rows.map((r) => (
            <EntityRow
              key={r.title}
              size="small"
              ornament={<Icon name={r.icon} size={20} color="var(--dt_color_content_primary)" />}
              title={r.title}
              titleFont={r.bold ? 'var(--sk-body-bold)' : undefined}
              onClick={() => (sheet ? sheet.dismiss(r.run) : r.run())}
            />
          ))}
        </Fragment>
      ))}
    </div>
  )
}
