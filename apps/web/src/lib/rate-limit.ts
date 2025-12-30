// No-op rate limit implementation
// Redis dependency has been removed - this is a placeholder that always allows requests

export const baseRateLimit = {
  limit: async (_key: string) => ({
    success: true,
    limit: 100,
    remaining: 100,
    reset: Date.now() + 60000,
  }),
};
