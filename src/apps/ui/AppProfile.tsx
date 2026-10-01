import { useState } from 'react'
import { useApp } from '../../app/store'
import { RichText } from '../../app/text/RichText'
import { Icon } from '../../icons/Icon'
import { SKButton, SKMemberAvatar } from '../../slackkit'
import { kitAppByUser } from '../index'

// The App Profile (spec blockkit.md §8; Modules/Features/AppProfile/Implementation/): an entities list of the card, the
// "About %@" description (6 lines, then "Show more"), the slash commands, the actions and the installation line
// (Extensions/AppProfilePresenter+AppProfile.swift:19-117). Inside an app DM's About tab the actions are
// "Configuration" and "App Homepage" (when the app has those URLs); pushed from a bot's name they're "Go To App" and
// "Add to VIP" / "Remove from VIP" (:139-222).

/** AppProfileCardView's color when the app sets none: sk_dark_gray #616061 (AppProfilePresenter.swift:57-63). */
const DEFAULT_CARD = 'var(--sk_dark_gray)'
/** Constants.maxNumberOfLines (AppProfilePresenter.swift:119) */
const DESCRIPTION_LINES = 6

export function AppProfile({ appUserId, insideAppHomeTab }: { appUserId: string; insideAppHomeTab?: boolean }) {
  const fx = useApp((s) => s.fx)
  const openDm = useApp((s) => s.openDm)
  const openConversation = useApp((s) => s.openConversation)
  const [expanded, setExpanded] = useState(false)
  const [vip, setVip] = useState(false)
  const user = fx.users[appUserId]
  const profile = fx.apps?.[appUserId]
  const kit = kitAppByUser(appUserId)
  const name = user?.realName || user?.name || kit?.def.name || 'App'
  const long = profile?.description ?? ''
  // the short description: the app's one-line description, else the first line of the long one
  const short = kit?.def.description ?? long.split('\n')[0].replace(/:$/, '')
  const icon = profile?.avatarLarge ?? user?.avatar
  const commands = kit?.def.commands ?? []
  const installer = kit?.def.about?.installedBy ?? fx.me
  const installerName = fx.users[installer]?.realName ?? installer
  const lines = long.split('\n').length
  const folds = lines > DESCRIPTION_LINES || long.length > 320

  return (
    <div className="app-profile">
      {/* AppProfileCardView: the card color, 24 / 16 padding, the 56 pt icon (radius 14), 16 pt, name Lato Bold 17 and the
          short description Lato 17, both white (AppProfileCardView.swift:26-113) */}
      <div className="app-profile__card" style={{ background: profile?.cardColor ?? DEFAULT_CARD }}>
        <SKMemberAvatar src={icon} name={name} size="extraLarge" />
        <div className="app-profile__card-text">
          <div className="app-profile__name">
            {name}
            {vip && <Icon name="vip_filled" size={17} className="app-profile__vip" />}
          </div>
          {short && <div className="app-profile__short">{short}</div>}
        </div>
      </div>

      {long && (
        <section className="app-profile__section">
          {/* app_profile_description_header "About %@" (yaml:1865) */}
          <div className="app-profile__header">{`About ${name}`}</div>
          <div className="app-profile__row">
            <div className={`app-profile__description${folds && !expanded ? ' is-folded' : ''}`} style={{ ['--lines' as string]: DESCRIPTION_LINES }}>
              <RichText text={long} jumbomoji={false} />
            </div>
            {folds && (
              // SKLabel content folding: "Show more" / "Show less", Lato Bold 13 content_highlight_1 (SKLabel.swift:1015-1032)
              <button type="button" className="app-profile__more" onClick={() => setExpanded((e) => !e)} data-tap>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </section>
      )}

      {commands.length > 0 && (
        <section className="app-profile__section">
          {/* app_profile_commands "Commands" (yaml:1859); SKCommandEntity .medium rows: the "/" box, the name, the usage
              after it, the description below (SKCommandEntity.swift:50-72; SKCommandEntitySnapshotTests) */}
          <div className="app-profile__header">Commands</div>
          {commands.map((c) => (
            <div key={c.command} className="app-profile__command">
              <span className="app-profile__slash">/</span>
              <span className="app-profile__command-text">
                <span className="app-profile__command-line">
                  <span className="app-profile__command-name">{c.command.replace(/^\//, '')}</span>
                  {c.usage && <span className="app-profile__command-usage">{c.usage}</span>}
                </span>
                {c.description && <span className="app-profile__command-desc">{c.description}</span>}
              </span>
            </div>
          ))}
        </section>
      )}

      {insideAppHomeTab ? (
        profile?.homepage && (
          <section className="app-profile__section app-profile__actions">
            {/* app_profile_app_homepage "App Homepage" (yaml:1856); Configuration needs a config URL, which kit apps don't have */}
            <SKButton title="App Homepage" buttonStyle="outlineDefault" size="medium" className="app-profile__button" onClick={() => window.open(profile.homepage, '_blank', 'noopener')} />
          </section>
        )
      ) : (
        <section className="app-profile__section app-profile__actions">
          {/* app_profile_go_to_app "Go To App" (yaml:1871) */}
          <SKButton
            title="Go To App"
            buttonStyle="outlineDefault"
            size="medium"
            className="app-profile__button"
            onClick={() => {
              const id = Object.values(fx.conversations).find((c) => c.type === 'app' && c.userId === appUserId)?.id ?? openDm([appUserId])
              openConversation(id)
            }}
          />
          {/* add_to_vip / remove_from_vip (yaml:901, 15372) with user_add / user_hide */}
          <SKButton
            title={vip ? 'Remove from VIP' : 'Add to VIP'}
            icon={vip ? 'user_hide' : 'user_add'}
            buttonStyle="outlineDefault"
            size="medium"
            className="app-profile__button"
            // toggles the priority preference; the card's name gets vip_filled (AppProfileInteractor.swift:104-116)
            onClick={() => setVip((v) => !v)}
          />
        </section>
      )}

      <section className="app-profile__section">
        {/* app_profile_app_added_by_you / _by_user (yaml:1853, 1850) */}
        <div className="app-profile__row app-profile__installed">{installer === fx.me ? `You added ${name} to this workspace.` : `${installerName} added ${name} to this workspace.`}</div>
      </section>
    </div>
  )
}
