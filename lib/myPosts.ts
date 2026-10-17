// Keys of posts created in this tab. A brand-new post from a fresh wallet usually starts below the
// Medium+ trust threshold (no confirmations, 0-day wallet), so without this the author's own post
// would vanish from their feed. In-memory only — forgotten with the tab, like the identity.

const keys = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export function rememberMyPost(key: string) {
  keys.add(key.toLowerCase());
  version++;
  listeners.forEach((l) => l());
}

export const isMyPost = (key: string) => keys.has(key.toLowerCase());
export const myPostsVersion = () => version;
export function subscribeMyPosts(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
