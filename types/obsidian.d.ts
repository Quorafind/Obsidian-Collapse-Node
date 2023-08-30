import "obsidian";
import { App, Component, EventRef, ItemView, TFile } from "obsidian";
import { CanvasNodeUnknownData } from "./canvas";
import { CanvasData } from "obsidian/canvas";

declare module "obsidian" {

    type CanvasNodeID = string;
    type CanvasEdgeID = string;

    interface MenuItem {
        setSubmenu(): Menu;
    }

    interface WorkspaceLeaf {
        rebuildView(): void;
    }

    interface Workspace {
        on(
            name: CanvasCollapseEvt,
            cb: (
                view: ItemView,
                nodeID?: string[] | undefined,
            ) => any,
        ): EventRef;

        on(
            name: "canvas:selection-menu",
            cb: (
                menu: Menu,
                canvas: Canvas,
            ) => any,
        ): EventRef;

        on(
            name: "canvas:node-menu",
            cb: (
                menu: Menu,
                node: CanvasNode,
            ) => any,
        ): EventRef;

        on(
            name: "collapse-plugin-disabled",
            cb: () => any,
        ): EventRef;
    }

    interface Workspace {
        trigger(
            name: CanvasCollapseEvt,
            view: ItemView,
            nodeID?: string[] | undefined,
        ): void;

        trigger(
            name: "collapse-plugin-disabled",
        ): void;
    }

    interface CanvasView extends View {
        canvas: Canvas;
    }

    interface Canvas {
        readonly: boolean;

        x: number;
        y: number;
        nodes: Map<CanvasNodeID, CanvasNode>;
        edges: Map<string, CanvasEdge>;
        nodeInteractionLayer: CanvasInteractionLayer;
        selection: Set<CanvasNode>;

        wrapperEl: HTMLElement;

        history: any;
        requestPushHistory: any;
        nodeIndex: any;

        requestSave(save?: boolean, triggerBySelf?: boolean): void;

        getData(): CanvasData;

        setData(data: CanvasData): void;

        getEdgesForNode(node: CanvasNode): CanvasEdge[];

        getContainingNodes(coords: CanvasCoords): CanvasNode[];
    }

    interface ICanvasData {
        nodes: CanvasNode[];
        edges: CanvasEdge[];
    }

    interface CanvasInteractionLayer {
        interactionEl: HTMLElement;
        canvas: Canvas;
        target: CanvasNode | null;

        render(): void;

        setTarget(target: CanvasNode | null): void;
    }

    interface CanvasNode {
        id: CanvasNodeID;

        x: number;
        y: number;
        width: number;
        height: number;
        zIndex: number;
        bbox: CanvasCoords;
        unknownData: CanvasNodeUnknownData;
        renderedZIndex: number;

        headerComponent: Component;

        nodeEl: HTMLElement;
        labelEl: HTMLElement;
        contentEl: HTMLElement;
        containerEl: HTMLElement;

        canvas: Canvas;
        app: App;

        getBBox(containing?: boolean): CanvasCoords;

        render(): void;
    }

    interface CanvasTextNode extends CanvasNode {
        text: string;
    }

    interface CanvasFileNode extends CanvasNode {
        file: TFile;
    }

    interface CanvasLinkNode extends CanvasNode {
        url: string;
    }

    interface CanvasGroupNode extends CanvasNode {
        label: string;
    }

    interface CanvasEdge {
        id: CanvasEdgeID;

        label: string | undefined;
        lineStartGroupEl: SVGGElement;
        lineEndGroupEl: SVGGElement;
        lineGroupEl: SVGGElement;

        path: {
            display: SVGPathElement;
            interaction: SVGPathElement;
        }

        canvas: Canvas;
        bbox: CanvasCoords;

        unknownData: CanvasNodeUnknownData;
    }

    interface CanvasCoords {
        maxX: number;
        maxY: number;
        minX: number;
        minY: number;
    }
}



