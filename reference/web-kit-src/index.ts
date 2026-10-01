// Everything a prototype needs, from one place:  import { definePrototype, bk, persona } from '../../src/kit'
// Guide: docs/prototyping.md. Nothing here touches the store, so prototypes load before the app renders.

export { definePrototype, imageFile, personId, channelId } from './prototype'
export type {
  ChannelInput,
  ExtendKit,
  MessageInput,
  PersonInput,
  Prototype,
  PrototypeDefinition,
  SceneInput,
  SceneKit,
  ScenePost,
  SidebarInput,
  StartInput,
  StartView,
  WorkspaceInput,
} from './prototype'

// Assets (browse them at /?kit=assets)
export { persona, illustrated, appIcon, logo, fileIcon, filePreview, thumbnail } from './assets'
export type { AppIconId, FilePreviewId, FileTypeId, LogoId, ThumbnailId } from './assets'
export { PERSONAS, COMPANY_PERSONAS, CHANNEL_IDEAS } from '../data/personas'
export type { PersonaId } from '../data/personas'

// Apps and Block Kit (docs/app-kit.md, docs/block-kit.md)
export { bk, defineApp, seedMessage, replaceBlock, clockTime, shortDate } from '../apps/kit'
export type { AppContext, AppDefinition, KitBlock, ModalDefinition, PostedMessage } from '../apps/kit'
// The app at the top of Slack's Salesforce section (sidebar: { salesforce: … }); spread it to add a Home tab
export { salesforceApp } from './salesforce'
