/**
 * Typed error codes crossing the IPC boundary (architecture.md §5.5): every
 * error the renderer can see is one of these, never a raw `Error`/stack
 * trace. Full internal detail is logged via `LoggingService` before an
 * `IpcResult` carrying one of these codes is returned.
 */
export enum ErrorCode {
  // IPC boundary (this task): a request failed `zod` validation, or a
  // handler threw an error that wasn't mapped to a more specific code below.
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Domain codes named explicitly in architecture.md §5.5, reserved for the
  // features that will produce them (NAS Service, MKVToolNix Service,
  // Processing Engine, Parser) as those milestones are implemented.
  NAS_OFFLINE = 'NAS_OFFLINE',
  MKVTOOLNIX_MISSING = 'MKVTOOLNIX_MISSING',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  PARSE_AMBIGUOUS = 'PARSE_AMBIGUOUS',
}
