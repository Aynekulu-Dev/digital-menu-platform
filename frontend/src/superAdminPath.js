// Always normalize to a leading-slash, no-trailing-slash path, regardless of
// whether VITE_SUPER_ADMIN_PATH was set with or without a leading slash.
// Without this, a value like "platform-ctrl-d1619764" (no leading slash) gets
// treated as a *relative* path by react-router, which duplicates the segment
// on redirects (e.g. "/platform-ctrl-d1619764/platform-ctrl-d1619764/login").
const raw = (import.meta.env.VITE_SUPER_ADMIN_PATH || '/super-admin').trim()
const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
export const SUPER_ADMIN_PATH = withLeadingSlash.replace(/\/+$/, '') || '/super-admin'