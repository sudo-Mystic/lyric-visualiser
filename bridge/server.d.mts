export interface BridgeHandle {
  url: string;
  reused: boolean;
  close: () => Promise<void>;
}

export function startBridge(options?: {
  port?: number;
  quiet?: boolean;
}): Promise<BridgeHandle>;
