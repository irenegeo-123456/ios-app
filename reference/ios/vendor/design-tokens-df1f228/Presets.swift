/*
	Auto-generated file — do not edit directly
	For more info: https://slack-github.com/slack/design-tokens

	iOS does not support custom HEX values https://slack-pde.slack.com/archives/C03RFTJCUTY/p1732656886845099?thread_ts=1729545523.112469&cid=C03RFTJCUTY
*/

import DesignTokensLibrary
import Foundation

public struct Preset {
	public let name: String
	public let i18nId: String
	public let colorSet: ColorSet
	public let monochromatic: Bool

	public init(name: String, i18nId: String, colorSet: ColorSet, monochromatic: Bool) {
		self.name = name
		self.i18nId = i18nId
		self.colorSet = colorSet
		self.monochromatic = monochromatic
	}
}

public struct PresetSection: Hashable {
	public let name: String
	public let i18nId: String
	public let position: Int

	public init(name: String, i18nId: String, position: Int) {
		self.name = name
		self.i18nId = i18nId
		self.position = position
	}
}

public extension ColorSet {
	static let presets: [PresetSection: [Preset]] = [
		PresetSection(name: "Single color", i18nId: "preset_section_single_color", position: 1) : [
			.init(name: "Aubergine", i18nId: "theme_preset_aubergine", colorSet: .init(primary: .standard(.aubergine), highlight1: .standard(.aubergine), highlight2: .standard(.jade), important: .standard(.aubergine), brightness: 6), monochromatic: true),
			.init(name: "Clementine", i18nId: "theme_preset_clementine", colorSet: .init(primary: .standard(.tangerine), highlight1: .standard(.tangerine), highlight2: .standard(.jade), important: .standard(.tangerine), brightness: 4), monochromatic: true),
			.init(name: "Banana", i18nId: "theme_preset_banana", colorSet: .init(primary: .standard(.sunflower), highlight1: .standard(.sunflower), highlight2: .standard(.jade), important: .standard(.sunflower), brightness: 2), monochromatic: true),
			.init(name: "Jade", i18nId: "theme_preset_jade", colorSet: .init(primary: .standard(.jade), highlight1: .standard(.jade), highlight2: .standard(.jade), important: .standard(.jade), brightness: 4), monochromatic: true),
			.init(name: "Lagoon", i18nId: "theme_preset_lagoon", colorSet: .init(primary: .standard(.lagoon), highlight1: .standard(.lagoon), highlight2: .standard(.jade), important: .standard(.lagoon), brightness: 5), monochromatic: true),
			.init(name: "Barbra", i18nId: "theme_preset_barbra", colorSet: .init(primary: .standard(.flamingo), highlight1: .standard(.flamingo), highlight2: .standard(.jade), important: .standard(.flamingo), brightness: 3), monochromatic: true),
			.init(name: "Gray", i18nId: "theme_preset_gray", colorSet: .init(primary: .standard(.gray), highlight1: .standard(.gray), highlight2: .standard(.jade), important: .standard(.flamingo), brightness: 2), monochromatic: true),
			.init(name: "Mood Indigo", i18nId: "theme_preset_mood_indigo", colorSet: .init(primary: .standard(.indigo), highlight1: .standard(.indigo), highlight2: .standard(.jade), important: .standard(.indigo), brightness: 6), monochromatic: true)
		],

		PresetSection(name: "Vision assistive", i18nId: "preset_section_vision_assistive", position: 2) : [
			.init(name: "Tritanopia", i18nId: "theme_preset_tritanopia", colorSet: .init(primary: .standard(.aubergine), highlight1: .standard(.jade), highlight2: .standard(.jade), important: .standard(.paprika), brightness: 6), monochromatic: false),
			.init(name: "Protanopia & Deuteranopia", i18nId: "theme_preset_protanopia_and_deuteranopia", colorSet: .init(primary: .standard(.aubergine), highlight1: .standard(.grass), highlight2: .standard(.grass), important: .standard(.aubergine), brightness: 6), monochromatic: false)
		],

		PresetSection(name: "Fun and new", i18nId: "preset_section_fun_and_new", position: 3) : [
			.init(name: "Raspberry Beret", i18nId: "theme_preset_raspberry_beret", colorSet: .init(primary: .standard(.aubergine), highlight1: .standard(.flamingo), highlight2: .standard(.aubergine), important: .standard(.flamingo), brightness: 3), monochromatic: false),
			.init(name: "Big Business", i18nId: "theme_preset_big_business", colorSet: .init(primary: .standard(.gray), highlight1: .standard(.indigo), highlight2: .standard(.indigo), important: .standard(.indigo), brightness: 4), monochromatic: false),
			.init(name: "POG", i18nId: "theme_preset_pog", colorSet: .init(primary: .standard(.sangria), highlight1: .standard(.honeycomb), highlight2: .standard(.sunflower), important: .standard(.sunflower), brightness: 3), monochromatic: false),
			.init(name: "Mint Chip", i18nId: "theme_preset_mint_chip", colorSet: .init(primary: .standard(.cilantro), highlight1: .standard(.indigo), highlight2: .standard(.indigo), important: .standard(.horchata), brightness: 3), monochromatic: false),
			.init(name: "PB&J", i18nId: "theme_preset_pbj", colorSet: .init(primary: .standard(.horchata), highlight1: .standard(.sangria), highlight2: .standard(.sangria), important: .standard(.flamingo), brightness: 3), monochromatic: false),
			.init(name: "Chill Vibes", i18nId: "theme_preset_chill_vibes", colorSet: .init(primary: .standard(.jade), highlight1: .standard(.aquarium), highlight2: .standard(.jade), important: .standard(.aquarium), brightness: 4), monochromatic: false),
			.init(name: "Forest Floor", i18nId: "theme_preset_forest_floor", colorSet: .init(primary: .standard(.grass), highlight1: .standard(.horchata), highlight2: .standard(.sunflower), important: .standard(.sunflower), brightness: 4), monochromatic: false),
			.init(name: "Slackr", i18nId: "theme_preset_slackr", colorSet: .init(primary: .standard(.flamingo), highlight1: .standard(.lagoon), highlight2: .standard(.mojito), important: .standard(.flamingo), brightness: 3), monochromatic: false),
			.init(name: "Sea Glass", i18nId: "theme_preset_sea_glass", colorSet: .init(primary: .standard(.aquarium), highlight1: .standard(.aubergine), highlight2: .standard(.aquarium), important: .standard(.aubergine), brightness: 3), monochromatic: false),
			.init(name: "Lemon Lime", i18nId: "theme_preset_lemon_lime", colorSet: .init(primary: .standard(.sunflower), highlight1: .standard(.cilantro), highlight2: .standard(.aubergine), important: .standard(.cilantro), brightness: 4), monochromatic: false),
			.init(name: "Falling Leaves", i18nId: "theme_preset_falling_leaves", colorSet: .init(primary: .standard(.horchata), highlight1: .standard(.sunflower), highlight2: .standard(.tangerine), important: .standard(.tomato), brightness: 4), monochromatic: false),
			.init(name: "Sunrise", i18nId: "theme_preset_sunrise", colorSet: .init(primary: .standard(.tangerine), highlight1: .standard(.flamingo), highlight2: .standard(.campfire), important: .standard(.honeycomb), brightness: 2), monochromatic: false)
		],

		PresetSection(name: "Updated classics", i18nId: "preset_section_updated_classics", position: 4) : [
			.init(name: "Choco Mint", i18nId: "theme_preset_choco_mint", colorSet: .init(primary: .standard(.horchata), highlight1: .standard(.jade), highlight2: .standard(.gray), important: .standard(.jade), brightness: 5), monochromatic: false),
			.init(name: "CMYK", i18nId: "theme_preset_cmyk", colorSet: .init(primary: .standard(.lagoon), highlight1: .standard(.flamingo), highlight2: .standard(.sunflower), important: .standard(.lagoon), brightness: 3), monochromatic: false),
			.init(name: "Haberdashery", i18nId: "theme_preset_haberdashery", colorSet: .init(primary: .standard(.lagoon), highlight1: .standard(.sunflower), highlight2: .standard(.cilantro), important: .standard(.rose), brightness: 6), monochromatic: false),
			.init(name: "Hoth", i18nId: "theme_preset_hoth", colorSet: .init(primary: .standard(.gray), highlight1: .standard(.lagoon), highlight2: .standard(.cilantro), important: .standard(.rose), brightness: 1), monochromatic: false),
			.init(name: "Ochin", i18nId: "theme_preset_ochin", colorSet: .init(primary: .standard(.ocean), highlight1: .standard(.ocean), highlight2: .standard(.cilantro), important: .standard(.mojito), brightness: 5), monochromatic: false),
			.init(name: "Sweet Treat", i18nId: "theme_preset_sweet_treat", colorSet: .init(primary: .standard(.tomato), highlight1: .standard(.tomato), highlight2: .standard(.horchata), important: .standard(.jade), brightness: 2), monochromatic: false)
		]
	]
}