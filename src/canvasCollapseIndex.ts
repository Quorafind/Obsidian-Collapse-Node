import {
	addIcon,
	Canvas,
	CanvasCoords,
	CanvasGroupNode,
	CanvasNode,
	CanvasView, editorInfoField,
	Menu,
	Plugin, PluginSettingTab,
	setIcon, Setting,
	setTooltip
} from 'obsidian';
import { around } from 'monkey-around';
import CollapseControlHeader from "./ControlHeader";
import { CanvasData } from "obsidian/canvas";
import {
	getSelectionCoords,
	handleCanvasMenu,
	handleMultiNodesViaNodes,
	handleNodeContextMenu,
	handleNodesViaCommands,
	handleSelectionContextMenu,
	handleSingleNode, refreshAllCanvasView
} from "./utils";
import { EditorView, ViewUpdate } from "@codemirror/view";


interface CollapsableNodeSettings {
	collapsableFileNode: boolean;
	collapsableAttachmentNode: boolean;
	collapsableGroupNode: boolean;
	collapsableLinkNode: boolean;
	collapsableTextNode: boolean;
}

interface OtherSettings {
	minLineAmount: number;
}

type CanvasCollapseSettings = CollapsableNodeSettings & OtherSettings;

const DEFAULT_SETTINGS: CanvasCollapseSettings = {
	collapsableFileNode: true,
	collapsableAttachmentNode: true,
	collapsableGroupNode: true,
	collapsableLinkNode: true,
	collapsableTextNode: true,

	minLineAmount: 0,
};

const DynamicUpdateControlHeader = (plugin: CanvasCollapsePlugin) => {
	return EditorView.updateListener.of((v: ViewUpdate) => {
		if (v.docChanged) {
			const editor = v.state.field(editorInfoField);
			const node = (editor as any).node;
			if (node) {
				if (node.unknownData.type === 'text' && !plugin.settings.collapsableTextNode) return;
				if (node.unknownData.type === 'file' && !plugin.settings.collapsableFileNode) return;

				if (node.unknownData.type === 'text' || (
					(node.unknownData.type === 'file') && node.file.extension === 'md')) {
					const content = v.view.state.doc.toString();
					if (node.headerComponent && plugin.settings.minLineAmount > 0 && content.split("\n").length < plugin.settings.minLineAmount) {
						node.headerComponent?.unload();
						node.headerComponent = undefined;
						return;
					} else if (!node.headerComponent && plugin.settings.minLineAmount > 0 && content.split("\n").length >= plugin.settings.minLineAmount) {
						node.headerComponent = new CollapseControlHeader(plugin, node);
						(node.containerEl as HTMLDivElement).prepend(node.headerComponent.onload());
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
		this.loadSettings();
		this.addSettingTab(new CollapseSettingTab(this.app, this));

		this.registerCommands();
		this.registerCanvasEvents();
		this.registerCustomIcons();

		this.patchCanvas();
		this.patchCanvasMenu();
		this.patchCanvasInteraction();
		this.patchCanvasNode(this);
		this.registerEditorExtension([DynamicUpdateControlHeader(this)]);
	}

	onunload() {
		console.log('unloading plugin');
		refreshAllCanvasView(this.app);
	}

	registerCommands() {
		this.addCommand({
			id: 'fold-all-nodes',
			name: 'Fold all nodes',
			checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, true, true)
		});

		this.addCommand({
			id: 'expand-all-nodes',
			name: 'Expand all nodes',
			checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, true, false)
		});

		this.addCommand({
			id: 'fold-selected-nodes',
			name: 'Fold selected nodes',
			checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, false, true)
		});

		this.addCommand({
			id: 'expand-selected-nodes',
			name: 'Expand selected nodes',
			checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, false, false)
		});
	}

	registerCanvasEvents() {
		this.registerEvent(this.app.workspace.on("collapse-node:patched-canvas", () => {
			refreshAllCanvasView(this.app);
		}));
		this.registerEvent(this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
			handleSelectionContextMenu(this, menu, canvas);
		}));
		this.registerEvent(this.app.workspace.on("canvas:node-menu", (menu, node) => {
			handleNodeContextMenu(this, menu, node);
		}));
	}

	registerCustomIcons() {
		addIcon("fold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 16.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 7.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
		addIcon("unfold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 22.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 1.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
	}

	patchCanvas() {
		const checkCoords = (e: CanvasCoords, t: CanvasCoords) => {
			return e.minX <= t.minX && e.minY <= t.minY && e.maxX >= t.maxX && e.maxY >= t.maxY;
		};

		const checkTriggerByPlugin = () => {
			return this.triggerByPlugin;
		};

		const toggleTriggerByPlugin = () => {
			this.triggerByPlugin = !this.triggerByPlugin;
		};

		const patchCanvas = () => {
			const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
			if (!canvasView) return false;

			const canvas: Canvas = (canvasView as CanvasView)?.canvas;
			if (!canvas) return false;

			const uninstaller = around(canvas.constructor.prototype, {
				getContainingNodes: (next: any) =>
					function (e: CanvasCoords) {
						const result = next.call(this, e);

						const checkExistGroupNode: CanvasNode | null = this.nodeIndex.search(e).find((t: CanvasNode) => t.unknownData.type === "group" || (t as CanvasGroupNode).label);
						if (!checkExistGroupNode) return result;
						const renewCoords = checkExistGroupNode?.getBBox(true);
						if (renewCoords !== e && (e.maxY - e.minY) === 40) {
							const newResult = this.nodeIndex.search(renewCoords).filter((t: any) => {
								return checkCoords(renewCoords, t.getBBox(true));
							});
							if (newResult.length > result.length) {
								return newResult;
							}
						}
						return result;
					},
				requestSave: (next: any) =>
					function (args?: boolean, triggerBySelf?: boolean) {
						next.call(this, args);
						if (triggerBySelf) {
							if (args !== undefined) {
								this.data = this.getData();
								args && this.requestPushHistory(this.data);
							}
						}
					},
				pushHistory: (next: any) =>
					function (args: CanvasData) {
						if (checkTriggerByPlugin()) {
							toggleTriggerByPlugin();
							return;
						}
						return next.call(this, args);
					},
				selectAll: (next: any) =>
					function (e: Set<CanvasNode>) {
						if (this.wrapperEl.querySelector(".canvas-selection")) {
							const domCoords = getSelectionCoords(this.wrapperEl.querySelector(".canvas-selection") as HTMLElement);
							if (domCoords) {
								const newResult = Array.from(e).filter((t: CanvasNode) => {
									if (!t.unknownData.collapsed) return true;
									if (t.nodeEl.hasClass("group-nodes-collapsed")) return false;
									return checkCoords(domCoords, t.getBBox());
								});
								if (newResult.length > 0) {
									const ne = new Set(newResult);
									return next.call(this, ne);
								}
								if (newResult.length === 0) {
									return;
								}

							}
						}
						return next.call(this, e);
					},
				createTextNode: (next: any) =>
					function (args: any) {
						if (args.size === undefined && args.pos) {
							return next.call(this, {
								...args,
								pos: {
									x: args.pos.x,
									y: args.pos.y,
									width: args?.size?.width || 250,
									height: args?.size?.height || 140,
								},
								size: {
									x: args.pos.x,
									y: args.pos.y,
									width: args?.size?.width || 250,
									height: args?.size?.height || 140,
								}
							});
						}
						return next.call(this, args);
					},
				createGroupNode: (next: any) =>
					function (args: any) {
						if (args.size !== undefined && args.pos) {
							return next.call(this, {
								...args,
								pos: {
									x: args.pos.x,
									y: args.pos.y - 30,
									width: args?.size?.width,
									height: args?.size?.height + 30,
								},
								size: {
									x: args.pos.x,
									y: args.pos.y - 30,
									width: args?.size?.width,
									height: args?.size?.height + 30,
								}
							});
						}
						return next.call(this, args);
					},

			});
			this.register(uninstaller);
			this.patchSucceed = true;

			console.log("Obsidian-Collapse-Node: canvas patched");
			return true;
		};

		this.app.workspace.onLayoutReady(() => {
			if (!patchCanvas()) {
				const evt = this.app.workspace.on("layout-change", () => {
					patchCanvas() && this.app.workspace.offref(evt);
				});
				this.registerEvent(evt);
			}
		});
	}

	patchCanvasMenu() {
		const triggerPlugin = () => {
			this.triggerByPlugin = true;
		};

		const patchMenu = () => {
			const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
			if (!canvasView) return false;

			const menu = (canvasView as CanvasView)?.canvas.menu;
			if (!menu) return false;

			const selection = menu.selection;
			if (!selection) return false;

			const menuUninstaller = around(menu.constructor.prototype, {
				render: (next: any) =>
					function (...args: any) {
						const result = next.call(this, ...args);
						if (this.menuEl.querySelector(".collapse-node-menu-item")) return result;
						const buttonEl = createEl("button", "clickable-icon collapse-node-menu-item");
						setTooltip(buttonEl, "Fold selected nodes", {
							placement: "top",
						});
						setIcon(buttonEl, "lucide-chevrons-left-right");
						this.menuEl.appendChild(buttonEl);
						buttonEl.addEventListener("click", () => {
							const pos = buttonEl.getBoundingClientRect();
							if (!buttonEl.hasClass("has-active-menu")) {
								buttonEl.toggleClass("has-active-menu", true);
								const menu = new Menu();
								const containingNodes = this.canvas.getContainingNodes(this.selection.bbox);

								handleCanvasMenu(menu, async (isFold: boolean) => {
									triggerPlugin();
									const currentSelection = this.canvas.selection;
									containingNodes.length > 1 ? handleMultiNodesViaNodes(this.canvas, containingNodes, isFold) : (currentSelection ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), isFold) : "");
									buttonEl.toggleClass("has-active-menu", false);
								});
								menu.setParentElement(this.menuEl).showAtPosition({
									x: pos.x,
									y: pos.bottom,
									width: pos.width,
									overlap: true
								});

							}
						});

						return result;
					},
			});

			this.register(menuUninstaller);
			this.app.workspace.trigger("collapse-node:patched-canvas");

			console.log("Obsidian-Collapse-Node: canvas history patched");
			return true;

		};


		this.app.workspace.onLayoutReady(() => {
			if (!patchMenu()) {
				const evt = this.app.workspace.on("layout-change", () => {
					patchMenu() && this.app.workspace.offref(evt);
				});
				this.registerEvent(evt);
			}
		});
	}

	patchCanvasInteraction() {
		const patchInteraction = () => {
			const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
			if (!canvasView) return false;

			const canvas = (canvasView as CanvasView)?.canvas.nodeInteractionLayer;
			if (!canvas) return false;

			const uninstaller = around(canvas.constructor.prototype, {
				render: (next: any) =>
					function (...args: any) {
						const result = next.call(this, ...args);
						if (!this.target) return result;
						const isCollapsed = this.target.nodeEl.hasClass("collapsed");
						const isGroupNodesCollapsed = this.target.nodeEl.hasClass("group-nodes-collapsed");

						if (this.target.unknownData) {
							this.interactionEl.toggleClass("collapsed-interaction", isCollapsed);
						}
						this.interactionEl.toggleClass("group-nodes-collapsed", isGroupNodesCollapsed);
						return result;
					},
			});
			this.register(uninstaller);

			console.log("Obsidian-Collapse-Node: canvas history patched");
			return true;
		};

		this.app.workspace.onLayoutReady(() => {
			if (!patchInteraction()) {
				const evt = this.app.workspace.on("layout-change", () => {
					patchInteraction() && this.app.workspace.offref(evt);
				});
				this.registerEvent(evt);
			}
		});
	}

	patchCanvasNode(plugin: CanvasCollapsePlugin) {
		const initControlHeader = (node: any) => {
			return new CollapseControlHeader(plugin, node);
		};

		const patchNode = () => {
			const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
			if (!canvasView) return false;

			const canvas: Canvas = (canvasView as CanvasView)?.canvas;
			if (!canvas) return false;

			const node = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values().next().value;

			if (!node) return false;
			let prototype = Object.getPrototypeOf(node);
			while (prototype && prototype !== Object.prototype) {
				prototype = Object.getPrototypeOf(prototype);
				// @ts-expected-error Find the parent prototype
				if (prototype.renderZIndex) {
					break;
				}
			}

			if (!prototype) return false;

			const uninstaller = around(prototype, {
				render: (next: any) =>
					function (...args: any) {
						const result = next.call(this, ...args);
						if (this.headerComponent) return result;

						if (!plugin.settings.collapsableFileNode && this.unknownData.type === "file" && this.file.extension === 'md') return result;
						if (!plugin.settings.collapsableAttachmentNode && this.unknownData.type === "file" && this.file.extension !== 'md') return result;
						if (!plugin.settings.collapsableGroupNode && this.unknownData.type === "group") return result;
						if (!plugin.settings.collapsableLinkNode && this.unknownData.type === "link") return result;
						if (!plugin.settings.collapsableTextNode && this.unknownData.type === "text") return result;

						if (plugin.settings.minLineAmount > 0 && (this.unknownData.type === "text" || this.unknownData.type === "file")) {
							if (typeof this.text === 'string' && this.text.split("\n").length < plugin.settings.minLineAmount) return result;
							if (this.file && this.file.extension === 'md' && this.child && this.child.data?.split("\n").length < plugin.settings.minLineAmount) return result;
						}

						this.headerComponent = initControlHeader(this);
						(this.containerEl as HTMLDivElement).prepend(this.headerComponent.onload());

						if (this.unknownData.collapsed) {
							this.nodeEl.toggleClass("collapsed", true);
							this.headerComponent.updateEdges();
						}
						return result;
					},
				getBBox: (next: any) =>
					function (containing?: boolean) {
						const result = next.call(this);
						if (containing !== true && (this.nodeEl as HTMLDivElement).hasClass("collapsed")) {
							const x = this.x;
							const y = this.y;
							const width = this.width;
							const height = 40;
							return {
								minX: x,
								minY: y,
								maxX: x + width,
								maxY: y + height,
							};
						}
						return result;
					},
				setData: (next: any) =>
					function (data: any) {
						if (data.collapsed !== undefined) {
							this.headerComponent?.setCollapsed(data.collapsed);
						}
						return next.call(this, data);
					}
			});
			this.register(uninstaller);

			console.log("Obsidian-Collapse-Node: canvas node patched");
			return true;
		};

		this.app.workspace.onLayoutReady(() => {
			if (!patchNode()) {
				const evt = this.app.workspace.on("layout-change", () => {
					patchNode() && this.app.workspace.offref(evt);
				});
				this.registerEvent(evt);
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName('Enable nodes to be collapsable');

		this.createCollapsableSetting(this.plugin, containerEl, 'File node', '', 'collapsableFileNode');
		this.createCollapsableSetting(this.plugin, containerEl, 'Attachment node', '', 'collapsableAttachmentNode');
		this.createCollapsableSetting(this.plugin, containerEl, 'Group node', '', 'collapsableGroupNode');
		this.createCollapsableSetting(this.plugin, containerEl, 'Link node', '', 'collapsableLinkNode');
		this.createCollapsableSetting(this.plugin, containerEl, 'Text node', '', 'collapsableTextNode');

		new Setting(containerEl).setHeading().setName('Detail settings');

		new Setting(containerEl).setName('Line amount the enable node to be collapsed').setDesc('The amount of lines that will be shown when the node is collapsed').addText(text => {
			text.setValue(this.plugin.settings.minLineAmount.toString())
				.onChange(async (value) => {
					if (!isNaN(Number(value))) {
						this.plugin.settings.minLineAmount = Number(value);
						await this.plugin.saveSettings();
					}
				});
		});
	}

	createCollapsableSetting(plugin: CanvasCollapsePlugin, containerEl: HTMLElement, name: string, desc: string, settingKey: keyof CollapsableNodeSettings) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => {
				toggle.setValue(plugin.settings[settingKey])
					.onChange(async (value) => {
						plugin.settings[settingKey] = value;
						await plugin.saveSettings();
					});
			});
	}
}

