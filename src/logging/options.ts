export const LOG_FORMAT_PRETTY = 'pretty' as const;
export const LOG_FORMAT_JSON = 'json' as const;

export type LogFormat = typeof LOG_FORMAT_PRETTY | typeof LOG_FORMAT_JSON;

export const logFormats = [LOG_FORMAT_PRETTY, LOG_FORMAT_JSON] as const satisfies readonly LogFormat[];

export interface LoggingOptions {
  format: LogFormat;
}

export const defaultLoggingOptions: LoggingOptions = {
  format: LOG_FORMAT_PRETTY,
};
