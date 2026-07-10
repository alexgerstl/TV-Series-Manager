import pinoFactory from 'pino';

import type { IConsoleSink } from './IConsoleSink';

type PinoLogger = ReturnType<typeof pinoFactory>;

/**
 * Wraps a pino logger as an `IConsoleSink` — the production console sink
 * used by the composition root (`main.ts`). Tests use a fake `IConsoleSink`
 * instead of this, so `LoggingService` itself never imports pino directly.
 */
export function createPinoConsoleSink(logger: PinoLogger = pinoFactory()): IConsoleSink {
  return {
    debug: (message: string) => logger.debug(message),
    info: (message: string) => logger.info(message),
    warn: (message: string) => logger.warn(message),
    error: (message: string) => logger.error(message),
  };
}
