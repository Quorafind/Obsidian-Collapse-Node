import {
    addIcon,
    Canvas,
    CanvasCoords,
    CanvasGroupNode,
    CanvasNode,
    CanvasView,
    ItemView,
    Menu,
    MenuItem,
    Plugin, WorkspaceLeaf
} from 'obsidian';
import { around } from 'monkey-around';
import CollapseControlHeader from "./ControlHeader";
import { CanvasData } from "obsidian/canvas";

const handleMultiNodes = (canvas: Canvas, allNodes: boolean, collapse: boolean) => {
    const nodes = allNodes ? Array.from(canvas.nodes.values()) : Array.from(canvas.selection) as any[];

    if (nodes && nodes.length > 0) {
        const canvasData = canvas.getData();
        for (const node of nodes) {
            if (node.unknownData.type === "group") {
                node.headerComponent.updateNodesInGroup();
            }
            node.headerComponent?.setCollapsed(collapse);
            const nodeData = canvasData.nodes.find((t: any) => t.id === node.id);
            if (nodeData) nodeData.collapsed = collapse;
        }
        canvas.setData(canvasData);
    }
    canvas.requestSave(true);
}

const handleSingleNode = (node: CanvasNode, collapse: boolean) => {
    if (node.unknownData.type === "group") {
        (node.headerComponent as CollapseControlHeader).updateNodesInGroup();
    }
    (node.headerComponent as CollapseControlHeader).setCollapsed(collapse);
}

const handleNodesViaCommands = (plugin: CanvasCollapsePlugin, checking: boolean, allNodes: boolean, collapse: boolean) => {
    const currentView = plugin.app.workspace.getActiveViewOfType(ItemView);
    if (currentView && currentView.getViewType() === "canvas") {
        if (!checking) {
            const canvasView = currentView as any;
            const canvas = canvasView.canvas as Canvas;
            handleMultiNodes(canvas, allNodes, collapse);
        }

        return true;
    }
}

const createHandleContextMenu = (section: string, callback: (isFold: boolean) => Promise<void>) => {
    return (menu: Menu) => {
        menu.addItem((item: MenuItem) => {
            const subMenu = item.setSection(section).setTitle('Canvas Collapse').setIcon('chevrons-left-right').setSubmenu();
            subMenu.addItem((item: MenuItem) => {
                item
                    .setIcon("fold-vertical")
                    .setTitle("Fold Selected Nodes")
                    .onClick(async () => {
                        await callback(true);
                    });
            }).addItem((item: any) => {
                item
                    .setIcon("unfold-vertical")
                    .setTitle("Expand Selected Nodes")
                    .onClick(async () => {
                        await callback(false);
                    });
            });
        });
    };
}

const handleSelectionContextMenu = (menu: Menu, canvas: Canvas) => {
    const callback = async (isFold: boolean) => {
        handleMultiNodes(canvas, false, isFold);
    };
    createHandleContextMenu('action', callback)(menu);
}

const handleNodeContextMenu = (menu: Menu, node: CanvasNode) => {
    const callback = async (isFold: boolean) => {
        handleSingleNode(node, isFold);
    };
    createHandleContextMenu('canvas', callback)(menu);
}

export default class CanvasCollapsePlugin extends Plugin {

    async onload() {
        this.registerCommands();
        this.registerCanvasEvents();
        this.registerCustomIcons();

        this.patchCanvas();
        this.patchCanvasInteraction();
        this.patchCanvasNode();
    }

    onunload() {
        console.log('unloading plugin');
        this.app.workspace.trigger("collapse-plugin-disabled");
    }

    registerCommands() {
        this.addCommand({
            id: 'fold-all-nodes',
            name: 'Fold All Nodes',
            checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, true, true)
        });

        this.addCommand({
            id: 'expand-all-nodes',
            name: 'Expand All Nodes',
            checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, true, false)
        });

        this.addCommand({
            id: 'fold-selected-nodes',
            name: 'Fold Selected Nodes',
            checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, false, true)
        });

        this.addCommand({
            id: 'expand-selected-nodes',
            name: 'Expand Selected Nodes',
            checkCallback: (checking: boolean) => handleNodesViaCommands(this, checking, false, false)
        });
    }

    registerCanvasEvents() {
        this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
            handleSelectionContextMenu(menu, canvas);
        })
        this.app.workspace.on("canvas:node-menu", (menu, node) => {
            handleNodeContextMenu(menu, node);
        })
    }

    registerCustomIcons() {
        addIcon("fold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 16.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 7.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
        addIcon("unfold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 22.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 1.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
    }

    patchCanvas() {
        const checkCoords = (e: CanvasCoords, t: CanvasCoords) => {
            return e.minX <= t.minX && e.minY <= t.minY && e.maxX >= t.maxX && e.maxY >= t.maxY
        }

        const getSelectionCoords = (dom: HTMLElement) => {
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
                }
            }
        }

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
                        const result = next.call(this, args);
                        if (triggerBySelf) {
                            if (args !== undefined) {
                                this.data = this.getData();
                                args && this.requestPushHistory(this.data);
                                this.triggerSaveByPlugin = true;
                            }
                        }
                    },
                pushHistory: (next: any) =>
                    function (args: CanvasData) {
                        if (this.triggerSaveByPlugin) {
                            this.triggerSaveByPlugin = false;
                            return;
                        }
                        const result = next.call(this, args);
                        return result;
                    },
                selectAll: (next: any) =>
                    function (e: Set<CanvasNode>) {
                        if (this.wrapperEl.querySelector(".canvas-selection")) {
                            const domCoords = getSelectionCoords(this.wrapperEl.querySelector(".canvas-selection") as HTMLElement);
                            if (domCoords) {
                                const newResult = Array.from(e).filter((t: CanvasNode) => {
                                    if (t.unknownData.collapsed !== true) return true;
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
                            const result = next.call(this, {
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
                            return result;
                        }
                        const result = next.call(this, args);
                        return result;
                    },
                createGroupNode: (next: any) =>
                    function (args: any) {
                        if (args.size !== undefined && args.pos) {
                            const result = next.call(this, {
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
                            return result;
                        }
                        const result = next.call(this, args);
                        return result;
                    }
            });
            this.register(uninstaller);

            console.log("Obsidian-Canvas-Collapsed: canvas patched");
            return true;
        }

        this.app.workspace.onLayoutReady(() => {
            if (!patchCanvas()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchCanvas() && this.app.workspace.offref(evt);
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
                        if (this.target.unknownData && !this.target.nodeEl.hasClass("collapsed")) {
                            this.interactionEl.toggleClass("collapsed-interaction", false);
                        }
                        if (this.target.unknownData && this.target.nodeEl.hasClass("collapsed")) {
                            this.interactionEl.toggleClass("collapsed-interaction", true);
                        }
                        if (this.target.nodeEl.hasClass("group-nodes-collapsed")) {
                            this.interactionEl.toggleClass("group-nodes-collapsed", true);
                        } else {
                            this.interactionEl.toggleClass("group-nodes-collapsed", false);
                        }
                        return result;
                    },
            });
            this.register(uninstaller);

            console.log("Obsidian-Canvas-Collapsed: canvas history patched");
            return true;
        }

        this.app.workspace.onLayoutReady(() => {
            if (!patchInteraction()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchInteraction() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

    patchCanvasNode() {
        const initControlHeader = (node: any) => {
            return new CollapseControlHeader(node, this.app);
        }

        const patchNode = () => {
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const canvas: Canvas = (canvasView as CanvasView)?.canvas;
            if (!canvas) return false;

            const node = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values().next().value;

            let prototype = Object.getPrototypeOf(node);
            while (prototype && prototype !== Object.prototype) {
                prototype = Object.getPrototypeOf(prototype);
                // @ts-expected-error Internal Method
                if (prototype.renderZIndex) {
                    break;
                }
            }

            const uninstaller = around(prototype, {
                render: (next: any) =>
                    function (...args: any) {
                        const result = next.call(this, ...args);
                        if (this.nodeEl.querySelector(".canvas-node-collapse-control")) return result;

                        this.headerComponent = initControlHeader(this);
                        (this.containerEl as HTMLDivElement).prepend(this.headerComponent.onload());

                        if (this.unknownData.collapsed) {
                            this.nodeEl.classList.add("collapsed");
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
                            }
                        }
                        return result;
                    },
                setData: (next: any) =>
                    function (data: any) {
                        if (data.collapsed !== undefined) {
                            this.headerComponent?.setCollapsed(data.collapsed);
                        }
                        const result = next.call(this, data);
                        return result;
                    }
            });
            this.register(uninstaller);

            console.log("Obsidian-Canvas-Collapsed: canvas node patched");
            return true;
        }

        this.app.workspace.onLayoutReady(() => {
            if (!patchNode()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchNode() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

}


