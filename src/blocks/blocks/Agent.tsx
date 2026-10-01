import type { ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import { SKIconButton, SKSpinner } from '../../slackkit'
import { registerBlock, useMeId, useSurface } from '../surface'
import { setExpanded, useBlockState } from '../state'
import { confirmFirst } from '../present'
import { RichTextBlockView } from './RichText'
import type { ContextActionsBlock, FeedbackButtonsElement, IconButtonElement, PlanBlock, PlanTask, TaskCardBlock, UrlSourceElement } from '../types'

// The agent blocks (spec blockkit.md §3.17–3.18): plan and task_card cards (Blocks/Plan/BKPlanBlockView.swift,
// Plan/Views/BKPlanTaskView.swift, Blocks/Task/*), and context_actions with feedback and icon buttons
// (Blocks/ContextActions/BKContextActionsBlockView.swift:62-128, Elements/FeedbackButtons/BKFeedbackButtonsView.swift).
//
// Sept (slack-objc 14b3cbaf): the card has no border any more: base_primary, radius 12, clipped, base_secondary while
// pressed when it can expand, 8 pt padding, rows 12 apart (BKTaskContainerView.swift:20-34,78-81;
// BKPlanBlockView.swift:27-30). The header is a 20 pt status ornament, 8 pt, the title in Lato Regular 17
// content_secondary (shimmering while loading), a 20 pt content_secondary caret when it can toggle
// (BKTaskHeaderView.swift:30-35,187-215,243-269,290-324). The whole card takes the tap (BKTaskContainerView.swift:49-66,
// BKPlanBlockView.swift:134-142). Both start collapsed; a tap toggles and the choice is remembered
// (TaskBlock / PlanBlock +BK…Convertible.swift: .collapsed unless the state cache says expanded). Behind the
// `ios_tasks_in_bottom_sheet` toggle (default off) a tap opens the tasks in a bottom sheet instead; not drawn here.
// Measured on BKTaskBlockSnapshotTests/testExpandedState_withOutputAndSources@3x.png and
// BKPlanBlockSnapshotTests/testAllStates_expanded@3x.png (Sept).

type Status = 'pending' | 'in_progress' | 'complete' | 'error'
/** BKTaskHeaderView.ContentState */
type HeaderState = 'loading' | 'complete' | 'error'
/** BKTaskOrnamentView.State (BKTaskOrnamentView.swift:160-181) */
type OrnamentState = 'hourglass' | 'spinner' | 'sparkles' | 'checkmarkFilled' | 'dot' | 'error' | 'errorFilled'

/**
 * BKTaskOrnamentView (BKTaskOrnamentView.swift:20-22,96-153,170-177): a 20 pt box with the icon centered, all
 * content_secondary but the errors (sk_raspberry_red): hourglass, ai_sparkle_filled, check_circle_filled, the 8 pt
 * icon_placeholder_filled dot, warning / warning_filled; or the medium (18 pt) spinner, a content_secondary arc over
 * surface_primary.
 */
function Ornament({ state }: { state: OrnamentState }) {
  if (state === 'spinner')
    return (
      <span className="bk-task__ornament">
        <SKSpinner size="medium" color={{ strokeColor: 'var(--dt_color_content_secondary)', baseCircleColor: 'var(--dt_color_surface_primary)' }} />
      </span>
    )
  const icon = { hourglass: 'hourglass', sparkles: 'ai_sparkle_filled', checkmarkFilled: 'check_circle_filled', dot: 'icon_placeholder_filled', error: 'warning', errorFilled: 'warning_filled' }[state]
  return (
    <span className={`bk-task__ornament${state === 'error' || state === 'errorFilled' ? ' is-error' : ''}`}>
      <Icon name={icon} size={state === 'dot' ? 8 : 20} />
    </span>
  )
}

/** The header's ornament: filled icons, the spinner while loading (BKTaskHeaderView.swift:307-324 with filled: true). */
const headerOrnament = (state: HeaderState): OrnamentState => (state === 'loading' ? 'spinner' : state === 'complete' ? 'checkmarkFilled' : 'errorFilled')

/** A plan task's ornament (BKPlanTaskView.swift:196-209): pending hourglass, in progress sparkles, complete the dot, error warning. */
const taskOrnament = (status: Status): OrnamentState => (status === 'in_progress' ? 'sparkles' : status === 'complete' ? 'dot' : status === 'error' ? 'error' : 'hourglass')

/** A source: a link in Lato 17 with the source's text (TaskBlock+BKBlockConvertible.swift:124-140, the PlanBlock one alike). */
function Source({ source }: { source: UrlSourceElement }) {
  return (
    <div className="bk-task__source">
      {/* a link run (src/app/text/RichText.tsx LinkRun): the tap opens it, not the card's toggle */}
      <span
        className="rt-link"
        role="link"
        data-tap
        onClick={(e) => {
          e.stopPropagation()
          window.open(source.url, '_blank', 'noopener')
        }}
      >
        {source.text}
      </span>
    </div>
  )
}

/**
 * One task item (BKTaskItemView.swift:27-32,53-80,142-192): a 20 pt column with the ornament and, 8 pt below it, the
 * 2 pt pipe filling the rest (BKTaskPipeView.swift:14-17,49-59: outline_tertiary, round ends, centered); without an
 * ornament the pipe is the whole column, with one it shows once the item is taller than 32 pt. Then the texts, 8 apart.
 */
function TaskItem({ ornament, children }: { ornament?: ReactNode; children: ReactNode }) {
  return (
    <div className={`bk-task__item${ornament ? ' has-ornament' : ''}`}>
      <span className="bk-task__rail">
        {ornament}
        <span className="bk-task__pipe" />
      </span>
      <div className="bk-task__texts">{children}</div>
    </div>
  )
}

const sourcesOf = (task: Pick<PlanTask, 'sources'>) => (task.sources ?? []).map((src, i) => <Source key={`s${i}`} source={src} />)

/** BKTaskHeaderView: the title shimmers while loading (BKShimmeringLabel.swift:17-25,44-78: a 1.4 s sweep to 15 % and back). */
function Header({ title, state, expandable, expanded }: { title: string; state: HeaderState; expandable: boolean; expanded: boolean }) {
  return (
    <div className="bk-task__header" role={expandable ? 'button' : 'heading'} aria-expanded={expandable ? expanded : undefined}>
      <Ornament state={headerOrnament(state)} />
      <span className={`bk-task__title${state === 'loading' ? ' is-loading' : ''}`}>{title}</span>
      {expandable && <Icon name={expanded ? 'caret_up' : 'caret_down'} size={20} className="bk-task__caret" />}
    </div>
  )
}

function useToggle(blockId: string) {
  const s = useSurface()
  const key = `${s.key}|${blockId}`
  const expanded = useBlockState((st) => st.expanded[key]) ?? false
  return [expanded, () => setExpanded(key, !expanded)] as const
}

/** The card (BKTaskContainerView): it takes the tap; it only highlights when the block can expand. */
function Card({ expandable, onToggle, className, children }: { expandable: boolean; onToggle: () => void; className?: string; children: ReactNode }) {
  return (
    <div className={`bk-task-card${className ? ` ${className}` : ''}`} data-tap={expandable ? '' : undefined} onClick={expandable ? onToggle : undefined}>
      {children}
    </div>
  )
}

/**
 * task_card (BKTaskBlockView.swift:144-187; BKTaskView.swift:93-117): the header (pending and in progress both load),
 * then, expanded, one item with no ornament: the details, the output and the sources, 8 apart. It can expand with
 * details, an output or sources (TaskBlock+BKBlockConvertible.swift:99-101). `hide_title` is parsed but only the
 * tasks bottom sheet reads it (BlockTaskListInteractor.swift:184), so the card keeps its header.
 */
function TaskCardView({ block, blockId }: { block: TaskCardBlock; blockId: string }) {
  const expandable = !!(block.details || block.output || block.sources?.length)
  const [expanded, toggle] = useToggle(blockId)
  const state: HeaderState = block.status === 'complete' ? 'complete' : block.status === 'error' ? 'error' : 'loading'
  const open = expandable && expanded
  return (
    <Card expandable={expandable} onToggle={toggle}>
      <Header title={block.title} state={state} expandable={expandable} expanded={open} />
      {open && (
        <TaskItem>
          {block.details && <RichTextBlockView block={block.details} />}
          {block.output && <RichTextBlockView block={block.output} />}
          {sourcesOf(block)}
        </TaskItem>
      )}
    </Card>
  )
}

/** The plan's header state: loading while any task is pending or in progress, then error if one failed (BKPlanBlockView.swift:180-195). */
function planState(tasks: PlanTask[]): HeaderState {
  if (tasks.some((t) => t.status === 'pending' || t.status === 'in_progress')) return 'loading'
  return tasks.some((t) => t.status === 'error') ? 'error' : 'complete'
}

/**
 * plan (BKPlanBlockView.swift:144-178; BKPlanTaskView.swift:103-136): the header, then, expanded, each task as one
 * item: its status ornament, the title (Lato Bold 17 content_primary), the details, the output and the sources, 8
 * apart. It can expand with any task (PlanBlock+BKContainerBlockConvertible.swift:90-92).
 */
function PlanView({ block, blockId }: { block: PlanBlock; blockId: string }) {
  const tasks = block.tasks ?? []
  const [expanded, toggle] = useToggle(blockId)
  const expandable = tasks.length > 0
  return (
    <Card expandable={expandable} onToggle={toggle} className="bk-plan">
      <Header title={block.title} state={planState(tasks)} expandable={expandable} expanded={expandable && expanded} />
      {expandable &&
        expanded &&
        tasks.map((t) => (
          <TaskItem key={t.task_id} ornament={<Ornament state={taskOrnament(t.status)} />}>
            <div className="bk-plan__task-title">{t.title}</div>
            {t.details && <RichTextBlockView block={t.details} />}
            {t.output && <RichTextBlockView block={t.output} />}
            {sourcesOf(t)}
          </TaskItem>
        ))}
    </Card>
  )
}

// ------------------------------------------------------------------------------------------------ context_actions

/** Feedback buttons: two 40 pt icon buttons, thumbs_up / thumbs_down, filled once chosen (FeedbackButtonsBlockElement+BKBlockConvertible.swift:60-75). */
function Feedback({ el, blockId }: { el: FeedbackButtonsElement; blockId: string }) {
  const s = useSurface()
  const v = s.values[blockId]?.[el.action_id]
  const chosen = v && 'value' in v ? v.value : null
  const pick = (which: 'positive' | 'negative') => {
    const b = which === 'positive' ? el.positive_button : el.negative_button
    s.setValue(blockId, el.action_id, { type: 'plain_text_input', value: b.value })
    void s.dispatch({ type: 'feedback_buttons', actionId: el.action_id, blockId, value: b.value })
  }
  return (
    <>
      <SKIconButton icon={chosen === el.positive_button.value ? 'thumbs_up_filled' : 'thumbs_up'} size="small" accessibilityLabel={el.positive_button.accessibility_label ?? el.positive_button.text.text} interactionState={s.interactive ? 'enabled' : 'disabled'} onClick={() => pick('positive')} />
      <SKIconButton icon={chosen === el.negative_button.value ? 'thumbs_down_filled' : 'thumbs_down'} size="small" accessibilityLabel={el.negative_button.accessibility_label ?? el.negative_button.text.text} interactionState={s.interactive ? 'enabled' : 'disabled'} onClick={() => pick('negative')} />
    </>
  )
}

function IconAction({ el, blockId }: { el: IconButtonElement; blockId: string }) {
  const s = useSurface()
  const me = useMeId()
  if (el.visible_to_user_ids && !el.visible_to_user_ids.includes(me)) return null
  const icon = el.icon === 'trash' ? 'trash' : el.icon.replace(/-/g, '_')
  return (
    <SKIconButton
      icon={icon}
      size="small"
      accessibilityLabel={el.accessibility_label ?? el.text.text}
      interactionState={!s.interactive ? 'disabled' : s.pending[blockId] === el.action_id ? 'processing' : 'enabled'}
      onClick={async () => {
        if (!(await confirmFirst(el.confirm))) return
        await s.dispatch({ type: 'icon_button', actionId: el.action_id, blockId, value: el.value }, { spinner: true })
      }}
    />
  )
}

function ContextActionsView({ block, blockId }: { block: ContextActionsBlock; blockId: string }) {
  const me = useMeId()
  // Elements hidden from you are dropped; a block with nothing left isn't drawn (BKBlockPresentationService.swift:327-339).
  const els = (block.elements ?? []).filter((e) => !(e.type === 'icon_button' && e.visible_to_user_ids && !e.visible_to_user_ids.includes(me)))
  if (!els.length) return null
  return (
    <div className="bk-context-actions" role="group" aria-label={block.accessibility_label}>
      {els.map((e, i) => (e.type === 'feedback_buttons' ? <Feedback key={i} el={e} blockId={blockId} /> : <IconAction key={i} el={e} blockId={blockId} />))}
    </div>
  )
}

registerBlock('task_card', TaskCardView as never)
registerBlock('plan', PlanView as never)
registerBlock('context_actions', ContextActionsView as never)
