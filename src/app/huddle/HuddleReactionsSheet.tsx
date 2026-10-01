import { useMemo } from 'react'
import { useApp } from '../store'
import { useSheet } from '../nav/SheetHost'
import { Emoji, EMOJI } from '../../emoji/Emoji'
import { SKPageController } from '../../slackkit/SKPageController'
import { useMyRoom } from './state'
import { react, sendEffect, setSticker } from './actions'
import { STICKERS } from './parts'
import './huddle.css'

// The huddle's reactions picker (spec search-slackbot-huddles.md §3.8; HuddlesReactionsFeature.swift:27-54,
// HuddlesReactionsViewController.swift:61, 87-96, 308-311): a sheet with a fixed 330 pt detent and a taller one, an
// SKPageController with the tabs Reactions (the emoji picker), Effects and Stickers (GIFs only when the workspace allows
// them). Picking one sends it and closes the sheet.

/** The frequently-used fallback for a new user (FrequentlyUsedEmojiDataProvider.swift:21-22), padded to the picker's
 *  21 on iPhone (EmojiGridViewModel.swift:157-169) with common reactions. */
const FREQUENT = ['slightly_smiling_face', '+1', 'white_check_mark', 'heart', 'eyes', 'bow', 'raised_hands', 'sparkle', 'joy', 'tada', 'clap', 'fire', '100', 'pray', 'laughing', 'heart_eyes', 'thinking_face', 'wave', 'rocket', 'muscle', 'ok_hand']

/** HuddlesEffectsService.swift:96-103: the built-in effects and their names. */
const EFFECTS: { emoji: string; label: string }[] = [
  { emoji: 'tada', label: 'Confetti' }, // huddle_effect_confetti
  { emoji: 'clap', label: 'Applause' }, // huddle_effect_applause
  { emoji: 'heart', label: 'Hearts' }, // huddle_effect_hearts
  { emoji: 'sparkles', label: 'Sparkles' }, // huddle_effect_sparkles
  { emoji: 'trophy', label: 'Great job!' }, // huddle_effect_winner
  { emoji: 'dolphin', label: 'Dolphin' }, // huddle_effect_dolphin
  { emoji: 'rocket', label: 'Rocket' }, // huddle_effect_rocket
  { emoji: 'alarm_clock', label: 'Time check' }, // huddle_effect_times_up
]

export function HuddleReactionsSheet() {
  const sheet = useSheet()
  const room = useMyRoom()
  const me = useApp((s) => s.fx.me)
  const mySticker = room?.stickers[me]
  const done = (fn: () => void) => (sheet ? sheet.dismiss(fn) : fn())
  const smileys = useMemo(() => EMOJI.filter((e) => e.c === 0).slice(0, 70).map((e) => e.n[0]), [])

  return (
    <div className="huddle-reactions" data-qa="huddle_reactions">
      <SKPageController
        tabBarPosition="top"
        isAnimatedPageIndexTransition
        pages={[
          {
            id: 'reactions',
            tab: { title: 'Reactions' }, // reactions
            content: (
              <div className="huddle-reactions__page ios-scroll" data-sheet-scroll>
                <EmojiSection title="Frequently Used" names={FREQUENT} onPick={(n) => done(() => react(n))} />
                <EmojiSection title="Smileys & People" names={smileys} onPick={(n) => done(() => react(n))} />
              </div>
            ),
          },
          {
            id: 'effects',
            tab: { title: 'Effects' }, // huddles_effects
            content: (
              <div className="huddle-reactions__page ios-scroll" data-sheet-scroll>
                <div className="huddle-tip">Effects play a short sound and larger reaction.</div>
                <div className="huddle-effects">
                  {EFFECTS.map((e) => (
                    <button key={e.emoji} type="button" className="huddle-effect-cell" onClick={() => done(() => sendEffect(e.emoji))} aria-label={e.label} data-tap>
                      <span className="huddle-effect-cell__emoji">
                        <Emoji name={e.emoji} size={32} />
                      </span>
                      <span className="huddle-effect-cell__label">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: 'stickers',
            tab: { title: 'Stickers' }, // huddles_stickers
            content: (
              <div className="huddle-reactions__page ios-scroll" data-sheet-scroll>
                <div className="huddle-tip">Stickers stay until you remove them.</div>
                <div className="huddle-stickers">
                  {STICKERS.map((s) => (
                    <button
                      key={s.emoji}
                      type="button"
                      className={`huddle-sticker${mySticker === s.emoji ? ' is-selected' : ''}`}
                      onClick={() => done(() => setSticker(mySticker === s.emoji ? null : s.emoji))}
                      aria-pressed={mySticker === s.emoji}
                      data-tap
                    >
                      <Emoji name={s.emoji} size={24} />
                      <span className="huddle-sticker__label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

/**
 * An emoji grid section (sheets-menus.md §2.3; EmojiGridViewController.swift:29-35, 80-84, 323-346): a 32 pt header in
 * caption contentSecondary, 7 columns of 36 pt cells justified between 16 pt insets, 16 pt between rows; pressed draws a
 * 48 pt baseTertiary circle behind the emoji.
 */
function EmojiSection({ title, names, onPick }: { title: string; names: string[]; onPick: (name: string) => void }) {
  return (
    <section className="huddle-emoji-section">
      <div className="huddle-emoji-section__header">{title}</div>
      <div className="huddle-emoji-grid">
        {names.map((n) => (
          <button key={n} type="button" className="huddle-emoji-cell" aria-label={n} onClick={() => onPick(n)} data-tap>
            <Emoji name={n} size={36} />
          </button>
        ))}
      </div>
    </section>
  )
}
