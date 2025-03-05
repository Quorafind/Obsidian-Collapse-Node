import {
	type CanvasFileNode,
	type CanvasGroupNode,
	type CanvasLinkNode,
	type CanvasNode,
	type CanvasTextNode,
	Component,
	parseFrontMatterAliases,
	setIcon,
} from "obsidian";
import type { HeaderComponent } from "./types/custom";
import type CanvasCollapsePlugin from ".";

export default class CollapseControlHeader
	extends Component
	implements HeaderComponent
{
	private collapsed = false;
	private collapsedIconEl: HTMLDivElement;
	private typeIconEl: HTMLDivElement;
	private titleEl: HTMLSpanElement;
	private headerEl: HTMLElement;
	private thumbnailEl: HTMLImageElement;
	private aliasEl: HTMLSpanElement;

	private content = "";
	private node: CanvasNode;
	private alias = "";
	private thumbnailUrl = "";

	private refreshed = false;
	private containingNodes: CanvasNode[] = [];

	plugin: CanvasCollapsePlugin;
	oldFilePath = "";

	constructor(plugin: CanvasCollapsePlugin, node: CanvasNode) {
		super();

		this.plugin = plugin;
		this.node = node;
		this.collapsed =
			node.unknownData.collapsed === undefined
				? false
				: node.unknownData.collapsed;
	}

	onload() {
		this.initHeader();
		this.initContent();
		this.initTypeIcon();
		this.updateNodesInGroup();
		this.updateNode();

		this.registerEvent(
			this.plugin.app.vault.on("rename", (file, oldPath) => {
				if (oldPath === this.oldFilePath) {
					this.titleEl.setText(file.name.split(".")[0]);
					this.oldFilePath = file.path;
				}
			})
		);

		return this.headerEl;
	}

	onunload() {
		super.onunload();
	}

	unload() {
		super.unload();

		this.headerEl.empty();
		this.headerEl.detach();
	}

	initHeader() {
		this.headerEl = createEl("div", {
			cls: "canvas-node-collapse-control",
		});
		this.registerDomEvent(this.headerEl, "click", async (evt) => {
			evt.preventDefault();
			evt.stopPropagation();
			await this.toggleCollapsed();
		});

		this.collapsedIconEl = this.headerEl.createEl("div", {
			cls: "canvas-node-collapse-control-icon",
		});

		this.typeIconEl = this.headerEl.createEl("div", {
			cls: "canvas-node-type-icon",
		});

		this.titleEl = this.headerEl.createEl("span", {
			cls: "canvas-node-collapse-control-title",
		});

		this.thumbnailEl = this.node.nodeEl.createEl("img", {
			cls: "canvas-node-collapse-control-thumbnail",
		});

		this.aliasEl = this.headerEl.createEl("span", {
			cls: "canvas-node-collapse-control-alias",
		});
	}

	checkNodeType() {
		return this.node.unknownData.type;
	}

	initTypeIcon() {
		this.setIconOrContent("setIcon");
	}

	initContent() {
		this.setIconOrContent("setContent");
		this.titleEl.setText(this.content?.replace(/^\#{1,} /g, ""));
		this.initAlias();
		this.initThumbnail();
	}

	initAlias() {
		// Try to get alias from node metadata
		if (this.node.unknownData && this.node.unknownData.alias) {
			this.alias = this.node.unknownData.alias;
		} else {
			// For file nodes, try to get alias from frontmatter
			const fileNode = this.node as any;
			if (fileNode.file && this.plugin.app.metadataCache) {
				try {
					const meta = this.plugin.app.metadataCache.getFileCache(
						fileNode.file
					);
					if (meta && meta.frontmatter) {
						const aliases = parseFrontMatterAliases(
							meta.frontmatter
						);
						if (aliases && aliases.length > 0) {
							this.alias = aliases[0];
						}
					}
				} catch (e) {
					console.debug("Error getting alias:", e);
				}
			}
		}

		if (this.alias) {
			this.aliasEl.setText(this.alias);
		} else {
			this.aliasEl.detach();
		}
	}

	updateNodeAlias(newAlias: string) {
		this.alias = newAlias;

		if (this.alias) {
			// Re-attach if it was detached
			if (!this.aliasEl.parentElement) {
				this.headerEl.appendChild(this.aliasEl);
			}
			this.aliasEl.setText(this.alias);
		} else {
			this.aliasEl.detach();
		}
	}

	initThumbnail() {
		// Try to get thumbnail from node metadata
		if (this.node.unknownData?.thumbnail) {
			this.thumbnailUrl = this.node.unknownData.thumbnail;
		} else {
			// For file nodes, try to get thumbnail from frontmatter
			const fileNode = this.node as any;
			if (fileNode.file && this.plugin.app.metadataCache) {
				try {
					const meta = this.plugin.app.metadataCache.getFileCache(
						fileNode.file
					);
					if (meta?.frontmatter?.thumbnail) {
						this.thumbnailUrl = meta.frontmatter.thumbnail;
					}
				} catch (e) {
					console.debug("Error getting thumbnail:", e);
				}
			}
		}

		if (this.thumbnailUrl) {
			try {
				// Handle both absolute and relative paths
				const url = this.thumbnailUrl.startsWith("http")
					? this.thumbnailUrl
					: this.plugin.app.vault.adapter.getResourcePath(
							this.thumbnailUrl
					  );

				this.thumbnailEl.src = url;
			} catch (e) {
				console.debug("Error setting thumbnail src:", e);
				this.thumbnailEl.detach();
			}
		} else {
			this.thumbnailEl.detach();
		}
	}

	updateNodeThumbnail(newThumbnailUrl: string) {
		this.thumbnailUrl = newThumbnailUrl;

		if (this.thumbnailUrl) {
			try {
				// Re-attach if it was detached
				if (!this.thumbnailEl.parentElement) {
					this.headerEl.appendChild(this.thumbnailEl);
				}

				// Handle both absolute and relative paths
				const url = this.thumbnailUrl.startsWith("http")
					? this.thumbnailUrl
					: this.plugin.app.vault.adapter.getResourcePath(
							this.thumbnailUrl
					  );

				this.thumbnailEl.src = url;
			} catch (e) {
				console.debug("Error setting thumbnail src:", e);
				this.thumbnailEl.detach();
			}
		} else {
			this.thumbnailEl.detach();
		}
	}

	setIconOrContent(action: "setIcon" | "setContent") {
		const currentType = this.checkNodeType();
		switch (currentType) {
			case "text":
				if (action === "setIcon")
					setIcon(this.typeIconEl, "sticky-note");
				if (action === "setContent")
					this.content =
						(this.node as CanvasTextNode).text.slice(0, 10) +
						((this.node as CanvasTextNode).text.length > 10
							? "..."
							: "");
				break;
			case "file":
				if (action === "setIcon") {
					if (
						(this.node as CanvasFileNode).file.name
							.split(".")[1]
							.trim() === "md"
					)
						setIcon(this.typeIconEl, "file-text");
					else setIcon(this.typeIconEl, "file-image");
				}
				if (action === "setContent")
					this.content = (
						this.node as CanvasFileNode
					).file?.name.split(".")[0];
				this.oldFilePath = (this.node as CanvasFileNode).file?.path;
				break;
			case "group":
				if (action === "setIcon")
					setIcon(this.typeIconEl, "create-group");
				if (action === "setContent") this.content = "";
				break;
			case "link":
				if (action === "setIcon") setIcon(this.typeIconEl, "link");
				if (action === "setContent")
					this.content = (this.node as CanvasLinkNode).url;
				break;
		}

		if (action === "setIcon" && !this.node.unknownData.type) {
			setIcon(this.typeIconEl, "sticky-note");
		}
	}

	setCollapsed(collapsed: boolean) {
		if (this.node.canvas.readonly) return;
		if (this.collapsed === collapsed) return;

		this.collapsed = collapsed;
		this.node.unknownData.collapsed = collapsed;

		this.updateNodesInGroup();
		this.updateNode();
		this.updateEdges();
	}

	refreshHistory() {
		if (this.refreshed) return;

		const history = this.node.canvas.history;
		if (!history || history.data.length === 0) return;

		for (const data of history.data) {
			for (const node of data.nodes) {
				if (node.id === this.node.id && node?.collapsed === undefined) {
					node.collapsed = false;
				}
			}
		}
		this.refreshed = true;
	}

	async toggleCollapsed() {
		if (this.node.canvas.readonly) return;
		this.collapsed = !this.collapsed;

		this.node.unknownData.collapsed = !this.collapsed;

		// Update visual state first for animation
		this.updateNode();

		// Add delay to allow for animation to complete before updating other elements
		setTimeout(() => {
			// Update nodes in group after a short delay to allow animation to start
			this.updateNodesInGroup();
			this.updateEdges();
		}, 50);

		this.node.canvas.requestSave(false, true);
		const canvasCurrentData = this.node.canvas.getData();
		const nodeData = canvasCurrentData.nodes.find(
			(node: any) => node.id === this.node.id
		);
		if (nodeData) {
			nodeData.collapsed = this.collapsed;
			this.refreshHistory();
		}

		setTimeout(() => {
			this.node.canvas.setData(canvasCurrentData);
			this.node.canvas.requestSave(true);
		}, 300); // Increased timeout to match animation duration
	}

	updateNode() {
		this.node.nodeEl.toggleClass("collapsed", this.collapsed);

		setIcon(this.collapsedIconEl, "chevron-down");
		this.collapsedIconEl.toggleClass(
			["collapsed", "collapse-handler"],
			this.collapsed
		);
		// Handle thumbnails visibility
		this.updateThumbnailVisibility();

		// Handle aliases visibility
		this.updateAliasVisibility();
	}

	updateThumbnailVisibility() {
		if (this.collapsed || this.plugin.settings.showThumbnailsAlways) {
			if (
				this.plugin.settings.showThumbnailsInCollapsedState &&
				this.thumbnailUrl &&
				this.thumbnailUrl !== this.node.unknownData.title
			) {
				this.thumbnailEl.toggleClass("collapsed-node-hidden", false);
				// Hide the title if we're showing an alias instead
				this.titleEl.toggleClass("collapsed-node-hidden", true);
			} else {
				this.thumbnailEl.toggleClass("collapsed-node-hidden", true);
				// Make sure title is visible if alias isn't shown
				this.titleEl.toggleClass("collapsed-node-hidden", false);
			}
		} else {
			this.thumbnailEl.toggleClass("collapsed-node-hidden", true);
		}
	}

	updateAliasVisibility() {
		if (this.collapsed || this.plugin.settings.showAliasesAlways) {
			if (
				this.plugin.settings.showAliasesInCollapsedState &&
				this.alias &&
				this.alias !== this.node.unknownData.title
			) {
				this.aliasEl.toggleClass("collapsed-node-hidden", false);
				// Hide the title if we're showing an alias instead
				this.titleEl.toggleClass("collapsed-node-hidden", true);
			} else {
				this.aliasEl.toggleClass("collapsed-node-hidden", true);
				// Make sure title is visible if alias isn't shown
				this.titleEl.toggleClass("collapsed-node-hidden", false);
			}
		} else {
			this.aliasEl.toggleClass("collapsed-node-hidden", true);
		}
	}

	updateEdges() {
		this.node.canvas.nodeInteractionLayer.interactionEl.detach();
		this.node.canvas.nodeInteractionLayer.render();
		const edges = this.node.canvas.getEdgesForNode(this.node);
		for (const edge of edges) {
			edge.render();
		}
	}

	updateNodesInGroup(expandAll?: boolean) {
		if (
			this.node.unknownData.type === "group" ||
			(this.node as CanvasGroupNode).label
		) {
			const nodes = this.node.canvas.getContainingNodes(
				this.node.getBBox(true)
			);

			if (expandAll) {
				this.collapsed = false;
			}

			// Add animation class to the group node
			this.node.nodeEl.toggleClass("animating", true);

			// Remove animation class after animation completes
			setTimeout(() => {
				this.node.nodeEl.toggleClass("animating", false);
			}, 300);

			if (this.collapsed) {
				const filteredNodes = nodes.filter(
					(node: CanvasNode) => node.id !== this.node.id
				);
				for (const node of filteredNodes) {
					this.containingNodes.push(node);

					// Add transition class before changing state
					node.nodeEl.toggleClass("node-transitioning", true);

					// Apply the collapsed state
					node.nodeEl.toggleClass(
						"group-nodes-collapsed",
						this.collapsed
					);

					// Remove transition class after animation completes
					setTimeout(() => {
						node.nodeEl.toggleClass("node-transitioning", false);
					}, 300);

					this.updateEdgesInGroup(node);
				}
			} else {
				const otherGroupNodes = nodes.filter(
					(node: CanvasNode) =>
						node.id !== this.node.id &&
						node.unknownData.type === "group" &&
						node.unknownData.collapsed
				);
				// Ignore those nodes in collapsed child group
				const ignoreNodes: CanvasNode[] = [];
				for (const groupNode of otherGroupNodes) {
					const bbox = groupNode.getBBox(true);
					const nodesInGroup =
						this.node.canvas.getContainingNodes(bbox);
					for (const childNode of nodesInGroup) {
						if (childNode.id !== groupNode.id) {
							ignoreNodes.push(childNode);
						}
					}
				}

				const filteredContainingNodes = this.containingNodes.filter(
					(t) => !ignoreNodes.find((k) => k.id === t.id)
				);

				for (const node of filteredContainingNodes) {
					// Add transition class before changing state
					node.nodeEl.toggleClass("node-transitioning", true);

					// Apply the expanded state
					node.nodeEl.toggleClass(
						"group-nodes-collapsed",
						this.collapsed
					);

					// Remove transition class after animation completes
					setTimeout(() => {
						node.nodeEl.toggleClass("node-transitioning", false);
					}, 300);

					this.updateEdgesInGroup(node, true);
				}

				for (const node of ignoreNodes) {
					this.updateEdgesInGroup(node, node.unknownData.collapsed);
				}

				this.containingNodes = [];
			}
			this.updateEdges();
		}
	}

	updateEdgesInGroup(node: CanvasNode, triggerCollapsed?: boolean) {
		const edges = this.node.canvas.getEdgesForNode(node);

		for (const edge of edges) {
			edge.labelElement?.wrapperEl?.classList.toggle(
				"group-edges-collapsed",
				triggerCollapsed || this.collapsed
			);
			edge.lineGroupEl.classList.toggle(
				"group-edges-collapsed",
				triggerCollapsed || this.collapsed
			);
			edge.lineEndGroupEl?.classList.toggle(
				"group-edges-collapsed",
				triggerCollapsed || this.collapsed
			);
			edge.lineStartGroupEl?.classList.toggle(
				"group-edges-collapsed",
				triggerCollapsed || this.collapsed
			);
		}
	}
}
