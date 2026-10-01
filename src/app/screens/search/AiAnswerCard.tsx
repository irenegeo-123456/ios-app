import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../store'
import { Icon } from '../../../icons/Icon'
import { InlineText } from '../../text/RichText'
import { answer, looksLikeQuestion } from '../slackbot/engine'

// The AI answer above the results (plugin aiAnswers, first in the default plugin order: SearchContentFeature+Dependencies.swift:62-74;
// SearchContentAiAnswersPluginPresenter.swift; AiSearchView.swift, AiSearchContentView.swift). With answer streaming off (its
// default) it's the legacy style:
//   a blank-divider section header (8 pt, SKListFooterView.Constants.topMargin; SKList.swift:2076-2081)
//   the header row: "✦ AI answer" (slack_ai_answer "%1$@ AI answer") in smallBodyBold contentTertiary, a disabled
//     .small SKGenericEntity (:390-413)
//   the card, 16 pt from the sides: aubergine _0 fill, 1 pt outlineTertiary border, radius 16 continuous, 10 pt top /
//     bottom padding, 16 pt inside; the topic heading in bodyBold contentPrimary, the body folded to 4 lines, 4 pt apart;
//     pressed: aubergine _5 and a 0.95 bounce (AiSearchView.swift:29-36, :109-112, :186-194, :318-350)
//   while loading: "Searching Slack conversations..." in .body contentTertiary with a 20 pt loading pill (:151-189)
//   errors: "Slack doesn't have a good answer right now" / "It may be that the information isn't available, or AI
//     misunderstood." (:211-230)
// The answer is the demo's Slackbot engine's (src/app/screens/slackbot/engine.ts), so it matches what Slackbot says.

const LOADING_MS = 1300

/** Only question-like queries get an answer (the plugin shows it "for question-like queries", spec §1.5). */
export const wantsAiAnswer = (query: string) => looksLikeQuestion(query)

export function AiAnswerCard({ query }: { query: string }) {
  const fx = useApp((s) => s.fx)
  const messages = useApp((s) => s.messages)
  const threads = useApp((s) => s.threads)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setLoading(true)
    setExpanded(false)
    const t = setTimeout(() => setLoading(false), LOADING_MS)
    return () => clearTimeout(t)
  }, [query])
  // computed once per query: the answer shouldn't change while you read it. A question the workspace's Slackbot has
  // already answered (fx.slackbot's seeded conversations) gets that answer; anything else, the engine's.
  const result = useMemo(() => {
    const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    for (const chat of fx.slackbot?.chats ?? [])
      for (const turn of chat.turns) if (norm(turn.question) === norm(query)) return { title: chat.title, text: turn.answer }
    return answer(query, { fx, messages, threads, history: [] })
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps
  const noAnswer = result.text.startsWith("I'm not sure I have enough context")
  const heading = noAnswer ? "Slack doesn't have a good answer right now" : result.title
  // The card's body is the answer's prose: citations dropped, blank lines folded (the full answer lives in Slackbot).
  const body = noAnswer ? "It may be that the information isn't available, or AI misunderstood." : result.text.replace(/\s?<cite:\/\/[^>]+>/g, '').replace(/\n{2,}/g, '\n')

  return (
    <section className="search-ai" data-qa="search_ai_answer">
      <div className="search-ai__header">
        <Icon name="ai_sparkle_filled" size={17} className="search-ai__sparkle" />
        <span>AI answer</span>
      </div>
      <div className={`search-ai__card${loading ? ' is-loading' : ''}`} data-tap={loading ? undefined : ''} role="button" onClick={() => !loading && setExpanded((e) => !e)}>
        <div className="search-ai__heading">{heading}</div>
        {loading ? (
          <>
            <div className="search-ai__body is-loading">Searching Slack conversations...</div>
            <i className="search-ai__loading-pill" aria-hidden />
          </>
        ) : (
          <div className="search-ai__body" style={expanded ? undefined : { WebkitLineClamp: 4 }}>
            {body.split('\n').map((line, i) => (
              <div key={i}>
                <InlineText text={line} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
