// TypeScript type reference — Metro resolves saveStrip.native.ts or saveStrip.web.ts at runtime.

export declare function useSavePermission(): [any, () => Promise<any>];
export declare function saveStripToGallery(uri: string, requestPermission?: any, currentPermission?: any): Promise<void>;
