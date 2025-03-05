import { around } from "monkey-around";
import {
	Canvas,
	CanvasGroupNode,
	CanvasNode,
	Menu,
	setIcon,
	setTooltip,
	ViewState,
	WorkspaceLeaf,
} from "obsidian";

import { CanvasCoords } from "obsidian";

import { CanvasView } from "obsidian";
import CanvasCollapsePlugin from ".";
import { CanvasData } from "obsidian/canvas";

import {
	getSelectionCoords,
	handleCanvasMenu,
	handleMultiNodesViaNodes,
	handleSingleNode,
} from "./utils";
import CollapseControlHeader from "./ControlHeader";

export const aroundCanvasMethods = (plugin: CanvasCollapsePlugin) => {
	const patchCanvasMethod = (canvasView: CanvasView) => {
		const checkCoords = (e: CanvasCoords, t: CanvasCoords) => {
			return (
				e.minX <= t.minX &&
				e.minY <= t.minY &&
				e.maxX >= t.maxX &&
				e.maxY >= t.maxY
			);
		};

		const checkTriggerByPlugin = () => {
			return plugin.triggerByPlugin;
		};

		const toggleTriggerByPlugin = () => {
			plugin.triggerByPlugin = !plugin.triggerByPlugin;
		};

		const patchCanvas = (canvas: Canvas) => {
			const uninstaller = around(canvas.constructor.prototype, {
				getContainingNodes: (next: any) =>
					function (e: CanvasCoords) {
						const result = next.call(this, e);

						const checkExistGroupNode: CanvasNode | null =
							this.nodeIndex
								.search(e)
								.find(
									(t: CanvasNode) =>
										t.unknownData.type === "group" ||
										(t as CanvasGroupNode).label
								);
						if (!checkExistGroupNode) return result;
						const renewCoords = checkExistGroupNode?.getBBox(true);
						if (renewCoords !== e && e.maxY - e.minY === 40) {
							const newResult = this.nodeIndex
								.search(renewCoords)
								.filter((t: any) => {
									return checkCoords(
										renewCoords,
										t.getBBox(true)
									);
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
							const domCoords = getSelectionCoords(
								this.wrapperEl.querySelector(
									".canvas-selection"
								) as HTMLElement
							);
							if (domCoords) {
								const newResult = Array.from(e).filter(
									(t: CanvasNode) => {
										if (!t.unknownData.collapsed)
											return true;
										if (
											t.nodeEl.hasClass(
												"group-nodes-collapsed"
											)
										)
											return false;
										return checkCoords(
											domCoords,
											t.getBBox()
										);
									}
								);
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
								},
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
								},
							});
						}
						return next.call(this, args);
					},
			});
			plugin.register(uninstaller);
			plugin.patchSucceed = true;

			console.log("Obsidian-Collapse-Node: canvas patched");
			return true;
		};

		patchCanvas(canvasView.canvas);
	};

	const uninstaller = around(WorkspaceLeaf.prototype, {
		setViewState(next) {
			return function (state: ViewState, ...rest: any[]) {
				if (state.state?.file) {
					if (
						state.state?.file &&
						(state.state?.file as string).endsWith(".canvas")
					) {
						setTimeout(() => {
							if (this.view.canvas) {
								patchCanvasMethod(this.view);
								uninstaller();
							}
						}, 400);
					}
				}

				return next.apply(this, [state, ...rest]);
			};
		},
	});
	plugin.register(uninstaller);
};

export const patchCanvasMenu = (plugin: CanvasCollapsePlugin) => {
	const triggerPlugin = () => {
		plugin.triggerByPlugin = true;
	};

	const patchMenu = async () => {
		const canvasLeaf = plugin.app.workspace
			.getLeavesOfType("canvas")
			.first();

		if (canvasLeaf?.isDeferred) {
			await canvasLeaf.loadIfDeferred();
		}

		const canvasView = canvasLeaf?.view;

		if (!canvasView) return false;
		const menu = (canvasView as CanvasView)?.canvas.menu;
		if (!menu) return false;

		const selection = menu.selection;
		if (!selection) return false;

		const menuUninstaller = around(menu.constructor.prototype, {
			render: (next: any) =>
				function (...args: any) {
					const result = next.call(this, ...args);
					if (this.menuEl.querySelector(".collapse-node-menu-item"))
						return result;
					const buttonEl = createEl(
						"button",
						"clickable-icon collapse-node-menu-item"
					);
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
							const containingNodes =
								this.canvas.getContainingNodes(
									this.selection.bbox
								);

							handleCanvasMenu(menu, async (isFold: boolean) => {
								triggerPlugin();
								const currentSelection = this.canvas.selection;
								containingNodes.length > 1
									? handleMultiNodesViaNodes(
											this.canvas,
											containingNodes,
											isFold
									  )
									: currentSelection
									? handleSingleNode(
											<CanvasNode>(
												Array.from(
													currentSelection
												)?.first()
											),
											isFold
									  )
									: "";
								buttonEl.toggleClass("has-active-menu", false);
							});
							menu.setParentElement(this.menuEl).showAtPosition({
								x: pos.x,
								y: pos.bottom,
								width: pos.width,
								overlap: true,
							});
						}
					});

					return result;
				},
		});

		plugin.register(menuUninstaller);
		plugin.app.workspace.trigger("collapse-node:patched-canvas");

		console.log("Obsidian-Collapse-Node: canvas history patched");
		return true;
	};

	plugin.app.workspace.onLayoutReady(async () => {
		if (!(await patchMenu())) {
			const evt = plugin.app.workspace.on("layout-change", async () => {
				(await patchMenu()) && plugin.app.workspace.offref(evt);
			});
			plugin.registerEvent(evt);
		}
	});
};

export const patchCanvasInteraction = (plugin: CanvasCollapsePlugin) => {
	const patchInteraction = () => {
		const canvasView = plugin.app.workspace
			.getLeavesOfType("canvas")
			.first()?.view;
		if (!canvasView) return false;

		const canvas = (canvasView as CanvasView)?.canvas.nodeInteractionLayer;
		if (!canvas) return false;

		const uninstaller = around(canvas.constructor.prototype, {
			render: (next: any) =>
				function (...args: any) {
					const result = next.call(this, ...args);
					if (!this.target) return result;
					const isCollapsed =
						this.target.nodeEl.hasClass("collapsed");
					const isGroupNodesCollapsed = this.target.nodeEl.hasClass(
						"group-nodes-collapsed"
					);

					if (this.target.unknownData) {
						this.interactionEl.toggleClass(
							"collapsed-interaction",
							isCollapsed
						);
					}
					this.interactionEl.toggleClass(
						"group-nodes-collapsed",
						isGroupNodesCollapsed
					);
					return result;
				},
		});
		plugin.register(uninstaller);

		console.log("Obsidian-Collapse-Node: canvas history patched");
		return true;
	};

	plugin.app.workspace.onLayoutReady(() => {
		if (!patchInteraction()) {
			const evt = plugin.app.workspace.on("layout-change", () => {
				patchInteraction() && plugin.app.workspace.offref(evt);
			});
			plugin.registerEvent(evt);
		}
	});
};

export const initControlHeader = (plugin: CanvasCollapsePlugin, node: any) => {
	return new CollapseControlHeader(plugin, node);
};

export const renderNodeWithHeader = (
	plugin: CanvasCollapsePlugin,
	node: any
) => {
	// If header already exists, don't create another one
	if (node.headerComponent) return;

	// Check node type against plugin settings
	const nodeType = node.unknownData.type;

	// Return early if this node type is disabled in settings
	if (
		nodeType === "file" &&
		node.file?.extension === "md" &&
		!plugin.settings.collapsableFileNode
	)
		return;
	if (
		nodeType === "file" &&
		node.file?.extension !== "md" &&
		!plugin.settings.collapsableAttachmentNode
	)
		return;
	if (nodeType === "group" && !plugin.settings.collapsableGroupNode) return;
	if (nodeType === "link" && !plugin.settings.collapsableLinkNode) return;
	if (nodeType === "text" && !plugin.settings.collapsableTextNode) return;

	// Check minimum line amount for text and file nodes
	if (
		plugin.settings.minLineAmount > 0 &&
		(nodeType === "text" || nodeType === "file")
	) {
		let lineCount = 0;

		if (nodeType === "text" && typeof node.text === "string") {
			lineCount = node.text.split("\n").length;
		} else if (
			nodeType === "file" &&
			node.file?.extension === "md" &&
			node.child
		) {
			lineCount = node.child.data?.split("\n").length || 0;
		}

		if (lineCount < plugin.settings.minLineAmount) return;
	}

	// Create header component
	node.headerComponent = initControlHeader(
		plugin,
		node
	) as CollapseControlHeader;
	node.nodeEl.setAttribute("data-node-type", nodeType);

	// Wait for containerEl to be loaded before adding header
	const addHeader = () => {
		if (!node.containerEl) {
			setTimeout(addHeader, 0);
			return;
		}
		(node.containerEl as HTMLDivElement).prepend(
			node.headerComponent.onload()
		);
	};
	addHeader();

	// Apply collapsed state if needed
	if (node.unknownData.collapsed) {
		node.nodeEl.toggleClass("collapsed", true);
		node.headerComponent.updateEdges();
	}
};

export const updateAllNodeWithHeader = (plugin: CanvasCollapsePlugin) => {
	const canvasLeaves = plugin.app.workspace.getLeavesOfType("canvas");

	for (const canvasLeaf of canvasLeaves) {
		const canvas: Canvas = (canvasLeaf.view as CanvasView)?.canvas;
		if (!canvas) continue;

		const nodes = canvas.nodes.values();

		for (const node of nodes) {
			renderNodeWithHeader(plugin, node);
		}
	}
};

export const patchCanvasNode = (plugin: CanvasCollapsePlugin) => {
	const patchNode = () => {
		const canvasView = plugin.app.workspace
			.getLeavesOfType("canvas")
			.first()?.view;
		if (!canvasView) return false;

		const canvas: Canvas = (canvasView as CanvasView)?.canvas;
		if (!canvas) return false;

		const node = (
			plugin.app.workspace.getLeavesOfType("canvas").first()?.view as any
		).canvas.nodes
			.values()
			.next().value;

		if (!node) return false;
		let prototype = Object.getPrototypeOf(node);
		while (prototype && prototype !== Object.prototype) {
			prototype = Object.getPrototypeOf(prototype);
			// @ts-expected-error Find the parent prototype
			if (prototype.renderZIndex) {
				break;
			}
		}

		console.log(prototype);

		if (!prototype) return false;

		const uninstaller = around(prototype, {
			render: (next: any) =>
				function (...args: any) {
					const result = next.call(this, ...args);
					renderNodeWithHeader(plugin, this);
					return result;
				},
			getBBox: (next: any) =>
				function (containing?: boolean) {
					const result = next.call(this);
					if (
						containing !== true &&
						(this.nodeEl as HTMLDivElement).hasClass("collapsed")
					) {
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
				},
		});
		plugin.register(uninstaller);
		updateAllNodeWithHeader(plugin);

		console.log("Obsidian-Collapse-Node: canvas node patched");
		return true;
	};

	plugin.app.workspace.onLayoutReady(() => {
		if (!patchNode()) {
			const evt = plugin.app.workspace.on("layout-change", () => {
				patchNode() && plugin.app.workspace.offref(evt);
			});
			plugin.registerEvent(evt);
		}
	});
};
