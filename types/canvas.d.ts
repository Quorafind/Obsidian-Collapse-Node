export type CanvasNodeType = 'link' | 'file' | 'text' | 'group';

export interface CanvasNodeUnknownData {
    id: string;
    type: CanvasNodeType;
    collapsed: boolean;

    [key: string]: any;
}
