import {
	App,
	Canvas,
	CanvasCoords,
	CanvasNode,
	ItemView,
	Menu,
	MenuItem,
	Modal,
	SuggestModal,
	TFile,
} from "obsidian";
import CollapseControlHeader from "./ControlHeader";
import CanvasCollapsePlugin from ".";

const getBoundingRect = (nodes: CanvasNode[]) => {
	const bboxArray = nodes.map((t: CanvasNode) => t.getBBox());

	const minX = Math.min(...bboxArray.map((t: CanvasCoords) => t.minX));
	const minY = Math.min(...bboxArray.map((t: CanvasCoords) => t.minY));
	const maxX = Math.max(...bboxArray.map((t: CanvasCoords) => t.maxX));
	const maxY = Math.max(...bboxArray.map((t: CanvasCoords) => t.maxY));

	return {
		minX,
		minY,
		maxX,
		maxY,
	};
};
const updateSelection = (canvas: Canvas) => {
	if (canvas.menu.selection.bbox) {
		const selection = Array.from(canvas.selection);
		const currentNodesInSelection = canvas.getContainingNodes(
			canvas.menu.selection.bbox
		);
		if (currentNodesInSelection.length > 0) {
			const boundingRect = getBoundingRect(
				selection.length > currentNodesInSelection.length
					? selection
					: currentNodesInSelection
			);
			if (boundingRect) {
				canvas.menu.selection.update(boundingRect);
			}
		}
	}
};
const handleMultiNodes = (
	canvas: Canvas,
	allNodes: boolean,
	collapse: boolean
) => {
	const nodes = allNodes
		? Array.from(canvas.nodes.values())
		: (Array.from(canvas.selection) as any[]);
	const canvasData = canvas.getData();

	if (nodes && nodes.length > 0) {
		for (const node of nodes) {
			if (node.unknownData.type === "group") {
				node.headerComponent.updateNodesInGroup(collapse);
			}
			node.headerComponent?.setCollapsed(collapse);
			const nodeData = canvasData.nodes.find(
				(t: any) => t.id === node.id
			);
			if (nodeData) nodeData.collapsed = collapse;
		}
		canvas.setData(canvasData);
	}
	canvas.requestSave(true, true);
	canvas.requestFrame();
	updateSelection(canvas);
};
export const handleMultiNodesViaNodes = (
	canvas: Canvas,
	nodes: CanvasNode[],
	collapse: boolean
) => {
	const canvasData = canvas.getData();

	if (nodes && nodes.length > 0) {
		for (const node of nodes) {
			if (node.unknownData.type === "group") {
				(
					node.headerComponent as CollapseControlHeader
				).updateNodesInGroup(collapse);
			}
			(node.headerComponent as CollapseControlHeader)?.setCollapsed(
				collapse
			);
			const nodeData = canvasData.nodes.find(
				(t: any) => t.id === node.id
			);
			if (nodeData) nodeData.collapsed = collapse;
		}
		canvas.setData(canvasData);
	}
	canvas.requestSave(true, true);
	updateSelection(canvas);
};
export const handleSingleNode = (node: CanvasNode, collapse: boolean) => {
	if (node.unknownData.type === "group") {
		(node.headerComponent as CollapseControlHeader).updateNodesInGroup();
	}
	const canvasData = node.canvas.getData();
	const nodeData = canvasData.nodes.find((t: any) => t.id === node.id);
	if (nodeData) nodeData.collapsed = collapse;
	node.canvas.setData(canvasData);
	node.canvas.requestSave(true, true);
	updateSelection(node.canvas);
};

export const handleNodesViaCommands = (
	plugin: CanvasCollapsePlugin,
	checking: boolean,
	allNodes: boolean,
	collapse: boolean
) => {
	plugin.triggerByPlugin = true;
	const currentView = plugin.app.workspace.getActiveViewOfType(ItemView);
	if (currentView && currentView.getViewType() === "canvas") {
		if (!checking) {
			const canvasView = currentView as any;
			const canvas = canvasView.canvas as Canvas;
			handleMultiNodes(canvas, allNodes, collapse);
		}

		return true;
	}
};

const createHandleContextMenu = (
	section: string,
	callback: (isFold: boolean) => Promise<void>
) => {
	return (menu: Menu) => {
		menu.addItem((item: MenuItem) => {
			const subMenu = item
				.setSection(section)
				.setTitle("Collapse node")
				.setIcon("chevrons-left-right")
				.setSubmenu();
			handleCanvasMenu(subMenu, callback);
		});
	};
};

export const handleCanvasMenu = (
	subMenu: Menu,
	callback: (isFold: boolean) => Promise<void>
) => {
	return subMenu
		.addItem((item: MenuItem) => {
			item.setIcon("fold-vertical")
				.setTitle("Fold selected nodes")
				.onClick(async () => {
					await callback(true);
				});
		})
		.addItem((item: any) => {
			item.setIcon("unfold-vertical")
				.setTitle("Expand selected nodes")
				.onClick(async () => {
					await callback(false);
				});
		});
};

export const handleSelectionContextMenu = (
	plugin: CanvasCollapsePlugin,
	menu: Menu,
	canvas: Canvas
) => {
	plugin.triggerByPlugin = true;
	const callback = async (isFold: boolean) => {
		handleMultiNodes(canvas, false, isFold);
	};
	createHandleContextMenu("action", callback)(menu);
};

export const handleNodeContextMenu = (
	plugin: CanvasCollapsePlugin,
	menu: Menu,
	node: CanvasNode
) => {
	plugin.triggerByPlugin = true;
	const callback = async (isFold: boolean) => {
		handleSingleNode(node, isFold);
	};
	createHandleContextMenu("canvas", callback)(menu);

	// Add Alias and Thumbnail menu items
	menu.addItem((item: MenuItem) => {
		item.setSection("canvas")
			.setTitle("Set Node Alias")
			.setIcon("text-cursor-input")
			.onClick(async () => {
				await setNodeAlias(plugin, node);
			});
	});

	menu.addItem((item: MenuItem) => {
		item.setSection("canvas")
			.setTitle("Set Node Thumbnail")
			.setIcon("image")
			.onClick(async () => {
				await setNodeThumbnail(plugin, node);
			});
	});

	// Add option to remove alias/thumbnail
	if (node.unknownData.alias || node.unknownData.thumbnail) {
		menu.addItem((item: MenuItem) => {
			item.setSection("canvas")
				.setTitle("Remove Node Customizations")
				.setIcon("trash")
				.onClick(async () => {
					await removeNodeCustomizations(plugin, node);
				});
		});
	}
};

// Function to set alias for a node
export const setNodeAlias = async (
	plugin: CanvasCollapsePlugin,
	node: CanvasNode
) => {
	const modal = new TextInputModal(
		plugin.app,
		"Enter alias for node",
		node.unknownData.alias || "",
		"Set Alias"
	);

	const alias = await modal.openAndGetValue();
	if (alias !== null) {
		// Set the alias in node data
		node.unknownData.alias = alias;

		// Update the node if it has a header component
		if (
			node.headerComponent &&
			node.headerComponent instanceof CollapseControlHeader
		) {
			const header = node.headerComponent as CollapseControlHeader;
			header.updateNodeAlias(alias);
			header.updateNode();
		}

		// Save the canvas state
		node.canvas.requestSave(false, true);
	}
};

// Function to set thumbnail for a node
export const setNodeThumbnail = async (
	plugin: CanvasCollapsePlugin,
	node: CanvasNode
) => {
	const modal = new ThumbnailSelectionModal(plugin.app);
	const thumbnailPath = await modal.openAndGetValue();

	if (thumbnailPath) {
		// Set the thumbnail in node data
		node.unknownData.thumbnail = thumbnailPath;

		// Update the node if it has a header component
		if (
			node.headerComponent &&
			node.headerComponent instanceof CollapseControlHeader
		) {
			const header = node.headerComponent as CollapseControlHeader;
			header.updateNodeThumbnail(thumbnailPath);
			header.updateNode();
		}

		// Save the canvas state
		node.canvas.requestSave(false, true);
	}
};

// Function to remove alias and thumbnail from node
export const removeNodeCustomizations = async (
	plugin: CanvasCollapsePlugin,
	node: CanvasNode
) => {
	delete node.unknownData.alias;
	delete node.unknownData.thumbnail;

	// Update the node if it has a header component
	if (
		node.headerComponent &&
		node.headerComponent instanceof CollapseControlHeader
	) {
		const header = node.headerComponent as CollapseControlHeader;
		header.updateNodeAlias("");
		header.updateNodeThumbnail("");
		header.updateNode();
	}

	// Save the canvas state
	node.canvas.requestSave(false, true);
};

// Class for text input modal
class TextInputModal extends Modal {
	private value: string;
	private inputEl: HTMLInputElement;
	private resolvePromise: (value: string | null) => void;
	private buttonText: string;

	constructor(
		app: App,
		private title: string,
		initialValue: string,
		buttonText: string
	) {
		super(app);
		this.value = initialValue;
		this.buttonText = buttonText;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: this.title });

		this.inputEl = contentEl.createEl("input", {
			type: "text",
			value: this.value,
		});
		this.inputEl.style.width = "100%";
		this.inputEl.style.marginBottom = "1em";

		// Focus input
		setTimeout(() => this.inputEl.focus(), 10);

		// Add buttons
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		const saveButton = buttonContainer.createEl("button", {
			text: this.buttonText,
			cls: "mod-cta",
		});

		cancelButton.addEventListener("click", () => {
			this.resolvePromise(null);
			this.close();
		});

		saveButton.addEventListener("click", () => {
			this.resolvePromise(this.inputEl.value);
			this.close();
		});

		// Handle Enter key
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.resolvePromise(this.inputEl.value);
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	openAndGetValue(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}

// Class for thumbnail selection modal
class ThumbnailSelectionModal extends Modal {
	private resolvePromise: (value: string | null) => void;
	private inputEl: HTMLInputElement;
	private fileInput: HTMLInputElement;
	private preview: HTMLImageElement;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Set Node Thumbnail" });

		// URL input
		contentEl.createEl("p", {
			text: "Enter image URL or path to an attachment:",
		});

		this.inputEl = contentEl.createEl("input", {
			type: "text",
			placeholder: "https://example.com/image.jpg or image.jpg",
		});
		this.inputEl.style.width = "100%";
		this.inputEl.style.marginBottom = "1em";

		// Or use file picker to select from vault
		contentEl.createEl("p", {
			text: "Or select an image from your attachments:",
		});

		const selectFileButton = contentEl.createEl("button", {
			text: "Browse vault files",
		});
		selectFileButton.addEventListener("click", () => {
			this.openFilePicker();
		});

		// Preview area
		contentEl.createEl("p", {
			text: "Preview:",
			cls: "thumbnail-preview-label",
		});
		this.preview = contentEl.createEl("img", { cls: "thumbnail-preview" });
		this.preview.style.maxWidth = "100%";
		this.preview.style.maxHeight = "150px";
		this.preview.style.display = "none";

		// Update preview when URL changes
		this.inputEl.addEventListener("input", () => {
			this.updatePreview();
		});

		// Buttons
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		buttonContainer.style.marginTop = "1em";

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		const saveButton = buttonContainer.createEl("button", {
			text: "Set Thumbnail",
			cls: "mod-cta",
		});

		cancelButton.addEventListener("click", () => {
			this.resolvePromise(null);
			this.close();
		});

		saveButton.addEventListener("click", () => {
			this.resolvePromise(this.inputEl.value);
			this.close();
		});
	}

	openFilePicker() {
		const fileSuggestModal = new FileSuggestModal(this.app, (file) => {
			if (file) {
				this.inputEl.value = file.path;
				this.updatePreview();
			}
		});
		fileSuggestModal.open();
	}

	updatePreview() {
		const url = this.inputEl.value;
		if (url) {
			try {
				// For remote URLs
				if (url.startsWith("http")) {
					this.preview.src = url;
					this.preview.style.display = "block";
				}
				// For local files
				else {
					this.preview.src =
						this.app.vault.adapter.getResourcePath(url);
					this.preview.style.display = "block";
				}
			} catch (e) {
				this.preview.style.display = "none";
			}
		} else {
			this.preview.style.display = "none";
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	openAndGetValue(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}

// File selection modal for picking a file from the vault
class FileSuggestModal extends SuggestModal<TFile> {
	private callback: (file: TFile | null) => void;

	constructor(app: App, callback: (file: TFile | null) => void) {
		super(app);
		this.callback = callback;
	}

	getSuggestions(query: string): TFile[] {
		const imageExtensions = [
			"png",
			"jpg",
			"jpeg",
			"gif",
			"bmp",
			"svg",
			"webp",
		];

		// Get all image files from the vault
		const files = this.app.vault
			.getFiles()
			.filter(
				(file) =>
					imageExtensions.includes(file.extension.toLowerCase()) &&
					file.path.toLowerCase().includes(query.toLowerCase())
			);

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.createEl("div", { text: file.path });
	}

	onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent) {
		this.callback(file);
	}

	onClose() {
		// If no selection was made, call the callback with null
		if (this.callback) {
			this.callback(null);
		}
	}
}

export const refreshAllCanvasView = (app: App) => {
	const cavasLeaves = app.workspace.getLeavesOfType("canvas");
	if (!cavasLeaves || cavasLeaves.length === 0) return;
	for (const leaf of cavasLeaves) {
		leaf.rebuildView();
	}
};

export const getSelectionCoords = (dom: HTMLElement) => {
	const domHTML = dom.outerHTML;

	const translateRegex = /translate\((-?\d+\.?\d*)px, (-?\d+\.?\d*)px\)/;
	const sizeRegex = /width: (\d+\.?\d*)px; height: (\d+\.?\d*)px;/;
	const translateMatches = domHTML.match(translateRegex);
	const sizeMatches = domHTML.match(sizeRegex);
	if (translateMatches && sizeMatches) {
		const x = parseFloat(translateMatches[1]);
		const y = parseFloat(translateMatches[2]);

		const width = parseFloat(sizeMatches[1]);
		const height = parseFloat(sizeMatches[2]);

		return {
			minX: x,
			minY: y,
			maxX: x + width,
			maxY: y + height,
		};
	}
};
