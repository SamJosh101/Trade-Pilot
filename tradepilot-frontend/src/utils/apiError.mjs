// API failures may come from the application or a hosting gateway.
// Never return an object for React to render, or stringify unknown diagnostics.
export function apiErrorMessage(data, fallback) {
  const error = data && typeof data === 'object' ? data.error : undefined;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}
