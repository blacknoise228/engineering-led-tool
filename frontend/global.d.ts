export {};

declare global {
  interface YmFunction {
    (id: number, method: string, options?: Record<string, unknown>): void;
    a?: unknown[][];
    l?: number;
  }

  interface Window {
    ym: YmFunction;
  }
}
