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

export class RateLimitError extends Error {
  readonly sourceId: string;

  constructor(sourceId: string, message = `${sourceId} rate limit exceeded`) {
    super(message);
    this.name = 'RateLimitError';
    this.sourceId = sourceId;
  }
}
