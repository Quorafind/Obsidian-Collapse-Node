import {
	addIcon,
	editorInfoField,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import CollapseControlHeader from "./ControlHeader";
import {
	handleNodeContextMenu,
	handleNodesViaCommands,
	handleSelectionContextMenu,
	refreshAllCanvasView,
} from "./utils";
import { EditorView, ViewUpdate } from "@codemirror/view";
import {
	aroundCanvasMethods,
	patchCanvasInteraction,
	patchCanvasMenu,
	patchCanvasNode,
} from "./patchUtils";

interface CollapsableNodeSettings {
	collapsableFileNode: boolean;
	collapsableAttachmentNode: boolean;
	collapsableGroupNode: boolean;
	collapsableLinkNode: boolean;
	collapsableTextNode: boolean;
}

interface OtherSettings {
	minLineAmount: number;
	minimalControlHeader: boolean;
}

type CanvasCollapseSettings = CollapsableNodeSettings & OtherSettings;

const DEFAULT_SETTINGS: CanvasCollapseSettings = {
	collapsableFileNode: true,
	collapsableAttachmentNode: true,
	collapsableGroupNode: true,
	collapsableLinkNode: true,
	collapsableTextNode: true,

	minLineAmount: 0,
	minimalControlHeader: false,
};

const DynamicUpdateControlHeader = (plugin: CanvasCollapsePlugin) => {
	return EditorView.updateListener.of((v: ViewUpdate) => {
		if (v.docChanged) {
			const editor = v.state.field(editorInfoField);
			const node = (editor as any).node;
			if (node) {
				if (
					node.unknownData.type === "text" &&
					!plugin.settings.collapsableTextNode
				)
					return;
				if (
					node.unknownData.type === "file" &&
					!plugin.settings.collapsableFileNode
				)
					return;

				if (
					node.unknownData.type === "text" ||
					(node.unknownData.type === "file" &&
						node.file.extension === "md")
				) {
					const content = v.view.state.doc.toString();
					if (
						node.headerComponent &&
						plugin.settings.minLineAmount > 0 &&
						content.split("\n").length <
							plugin.settings.minLineAmount
					) {
						node.headerComponent?.unload();
						node.headerComponent = undefined;
						return;
					} else if (
						!node.headerComponent &&
						plugin.settings.minLineAmount > 0 &&
						content.split("\n").length >=
							plugin.settings.minLineAmount
					) {
						node.headerComponent = new CollapseControlHeader(
							plugin,
							node
						);
						(node.containerEl as HTMLDivElement).prepend(
							node.headerComponent.onload()
						);
					}
				}
			}
		}
	});
};

export default class CanvasCollapsePlugin extends Plugin {
	triggerByPlugin: boolean = false;
	patchSucceed: boolean = false;

	settings: CanvasCollapseSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CollapseSettingTab(this.app, this));

		this.registerCommands();
		this.registerCanvasEvents();
		this.registerCustomIcons();

		this.registerEditorExtension([DynamicUpdateControlHeader(this)]);

		this.initGlobalCss();

		this.app.workspace.onLayoutReady(() => {
			aroundCanvasMethods(this);
			patchCanvasMenu(this);
			patchCanvasInteraction(this);
			patchCanvasNode(this);
		});
	}

	onunload() {
		console.log("unloading plugin");
		refreshAllCanvasView(this.app);
	}

	registerCommands() {
		this.addCommand({
			id: "fold-all-nodes",
			name: "Fold all nodes",
			checkCallback: (checking: boolean) =>
				handleNodesViaCommands(this, checking, true, true),
		});

		this.addCommand({
			id: "expand-all-nodes",
			name: "Expand all nodes",
			checkCallback: (checking: boolean) =>
				handleNodesViaCommands(this, checking, true, false),
		});

		this.addCommand({
			id: "fold-selected-nodes",
			name: "Fold selected nodes",
			checkCallback: (checking: boolean) =>
				handleNodesViaCommands(this, checking, false, true),
		});

		this.addCommand({
			id: "expand-selected-nodes",
			name: "Expand selected nodes",
			checkCallback: (checking: boolean) =>
				handleNodesViaCommands(this, checking, false, false),
		});
	}

	registerCanvasEvents() {
		this.registerEvent(
			this.app.workspace.on("collapse-node:patched-canvas", () => {
				refreshAllCanvasView(this.app);
			})
		);
		this.registerEvent(
			this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
				handleSelectionContextMenu(this, menu, canvas);
			})
		);
		this.registerEvent(
			this.app.workspace.on("canvas:node-menu", (menu, node) => {
				handleNodeContextMenu(this, menu, node);
			})
		);
	}

	registerCustomIcons() {
		addIcon(
			"fold-vertical",
			`<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 16.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 7.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`
		);
		addIcon(
			"unfold-vertical",
			`<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 22.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 1.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`
		);
	}

	initGlobalCss() {
		document.body.toggleClass(
			"minimal-control-header",
			this.settings?.minimalControlHeader
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class CollapseSettingTab extends PluginSettingTab {
	plugin: CanvasCollapsePlugin;

	constructor(app: any, plugin: CanvasCollapsePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setHeading()
			.setName("Enable nodes to be collapsable");

		this.createCollapsableSetting(
			this.plugin,
			containerEl,
			"File node",
			"",
			"collapsableFileNode"
		);
		this.createCollapsableSetting(
			this.plugin,
			containerEl,
			"Attachment node",
			"",
			"collapsableAttachmentNode"
		);
		this.createCollapsableSetting(
			this.plugin,
			containerEl,
			"Group node",
			"",
			"collapsableGroupNode"
		);
		this.createCollapsableSetting(
			this.plugin,
			containerEl,
			"Link node",
			"",
			"collapsableLinkNode"
		);
		this.createCollapsableSetting(
			this.plugin,
			containerEl,
			"Text node",
			"",
			"collapsableTextNode"
		);

		new Setting(containerEl).setHeading().setName("Detail settings");

		new Setting(containerEl)
			.setName("Line amount the enable node to be collapsed")
			.setDesc(
				"The amount of lines that will be shown when the node is collapsed"
			)
			.addText((text) => {
				text.setValue(
					this.plugin.settings.minLineAmount.toString()
				).onChange(async (value) => {
					if (!isNaN(Number(value))) {
						this.plugin.settings.minLineAmount = Number(value);
						await this.plugin.saveSettings();
					}
				});
			});

		new Setting(containerEl)
			.setName("Minimal control header")
			.setDesc(
				"Hide the text and also icon in the control header of the node"
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.minimalControlHeader)
					.onChange(async (value) => {
						this.plugin.settings.minimalControlHeader = value;
						document.body.toggleClass(
							"minimal-control-header",
							value
						);
						await this.plugin.saveSettings();
					});
			});
	}

	createCollapsableSetting(
		plugin: CanvasCollapsePlugin,
		containerEl: HTMLElement,
		name: string,
		desc: string,
		settingKey: keyof CollapsableNodeSettings
	) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => {
				toggle
					.setValue(plugin.settings[settingKey])
					.onChange(async (value) => {
						plugin.settings[settingKey] = value;
						await plugin.saveSettings();
					});
			});
	}
}
