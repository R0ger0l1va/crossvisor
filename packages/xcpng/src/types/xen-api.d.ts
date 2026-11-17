/**
 * Tipos mínimos para `xen-api` (Xen Orchestra no publica .d.ts).
 * Referencia: https://github.com/vatesfr/xen-orchestra/tree/master/packages/xen-api
 */
declare module 'xen-api' {
  import type { Readable } from 'node:stream';

  export interface XapiOptions {
    url: string;
    auth: { user: string; password: string };
    allowUnauthorized?: boolean;
    readOnly?: boolean;
    /** false = no abrir el long-poll de eventos (clientes de vida corta). */
    watchEvents?: boolean | string[];
    callTimeout?: number;
  }

  /** Registro XAPI: campos del objeto + $ref/$type no enumerables. */
  export type XapiRecord<T = Record<string, unknown>> = T & {
    readonly $ref: string;
    readonly $type: string;
  };

  export interface XapiResourceResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body: Readable;
    /** Promesa del task XAPI asociado a la descarga. */
    task?: Promise<unknown>;
  }

  export class Xapi {
    constructor(opts: XapiOptions);
    readonly status: 'connected' | 'connecting' | 'disconnected';
    readonly sessionId: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    call<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
    callAsync<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
    getAllRecords<T = Record<string, unknown>>(type: string): Promise<XapiRecord<T>[]>;
    getRecord<T = Record<string, unknown>>(type: string, ref: string): Promise<XapiRecord<T>>;
    getRecordByUuid<T = Record<string, unknown>>(type: string, uuid: string): Promise<XapiRecord<T>>;
    getResource(
      pathname: string,
      opts?: { host?: unknown; query?: Record<string, string>; task?: boolean | string },
    ): Promise<XapiResourceResponse>;
  }

  export function createClient(opts: XapiOptions): Xapi;
}
