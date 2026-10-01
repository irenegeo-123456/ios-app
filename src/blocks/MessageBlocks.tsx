import { useMemo } from 'react'
import { useApp } from '../app/store'
import type { BlockKitBlock, Message } from '../data/types'
import { kitBlockId } from './ids'
import { BlockSurface, EditedContext, normalizeBlocks } from './index'

// A message's Block Kit blocks (spec blockkit.md §9): they replace the message's text, fill the text column with no side
// insets, the first block 4 pt below the sender line (BlocksConverterUtility.swift:90-110; Utils.swift:24-53), and
// their interactions go to the app that posted the message. "(edited)" follows the last rich_text block when every
// block is rich_text (TextMapper.swift:36-62,173-196).

export interface MessageBlocksProps {
  blocks: BlockKitBlock[]
  conversationId: string
  ts: string
  /** false in previews and search results: elements are drawn disabled (spec §0 › Interaction gating) */
  interactive?: boolean
}

/** Finds the message (history or a thread) the blocks belong to. */
function useMessage(conversationId: string, ts: string): Message | undefined {
  return useApp((s) => {
    const top = s.messages[conversationId]?.find((m) => m.ts === ts)
    if (top) return top
    for (const [key, list] of Object.entries(s.threads)) {
      if (!key.startsWith(`${conversationId}/`)) continue
      const m = list.find((x) => x.ts === ts)
      if (m) return m
    }
    return undefined
  })
}

/** A message's Block Kit blocks as Slack iOS draws them. */
export function MessageBlocks({ blocks, conversationId, ts, interactive = true }: MessageBlocksProps) {
  const msg = useMessage(conversationId, ts)
  // Sept: not being a member of the conversation disables inputs, buttons and complex blocks, no longer behind a flag
  // (BKBlockPresentationService.swift:78-101; June: isMembershipBasedSurfaceEnablementEnabled). No memberIds: it's yours.
  const member = useApp((s) => {
    const c = s.fx.conversations[conversationId]
    return !c || !(c.type === 'channel' || c.type === 'private') || !c.memberIds || c.memberIds.includes(s.fx.me)
  })
  const list = useMemo(() => normalizeBlocks(blocks), [blocks])
  const editedBlock = useMemo(() => {
    if (!msg?.edited || !list.length || !list.every((b) => b.type === 'rich_text')) return null
    const i = list.length - 1
    return kitBlockId(list[i], i)
  }, [msg?.edited, list])
  return (
    <EditedContext.Provider value={editedBlock}>
      <BlockSurface blocks={list} surface="message" appUserId={msg?.userId} conversationId={conversationId} ts={ts} interactive={interactive && member} />
    </EditedContext.Provider>
  )
}
