export class AdapterFetchError extends Error {
  readonly sourceId: string;
  readonly statusCode?: number;
  readonly cause?: unknown;

  constructor(sourceId: string, message: string, options: { statusCode?: number; cause?: unknown } = {}) {
    super(message);
    this.name = 'AdapterFetchError';
    this.sourceId = sourceId;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
  }
}
