declare module "node-signalr" {
  interface ClientOptions {
    headers?: Record<string, string>;
  }

  class Client {
    constructor(url: string, hubs: string[], options?: ClientOptions);
    on(event: "connected", callback: () => void): void;
    on(event: "disconnected", callback: (reason: string) => void): void;
    on(event: "error", callback: (err: Error) => void): void;
    on(hub: string, method: string, callback: (...args: unknown[]) => void): void;
    call(hub: string, method: string, ...args: unknown[]): Promise<unknown>;
    start(): void;
    end(): void;
  }

  export { Client };
  export default { Client };
}
