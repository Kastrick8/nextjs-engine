# Errors and Diagnostics

Generation 3 error handling has two related layers:

1. Runtime/build reporting and Next.js error fallbacks.
2. Stable diagnostic codes with a reason and repair guidance.

## References

- [Global error handling](./global-error-handling.md)
- [Generation 3 Error Code Book](./error-codes/README.md)
- [EngineDebug](../debug/index.md)
- [Compatibility and debugging hardening](../../compatibility-debugging-hardening.md)

The code book is organized by subsystem so developers can find the diagnostic family that owns a failure. Do not treat internal error codes as a substitute for handling HTTP status codes or application-level errors.
