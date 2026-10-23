import { sb, showPhone } from "./sb";

/* ================= أنواع السوشيال ================= */
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: string;
}
export interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_url: string | null;
  created_at: string;
  author?: string;
  likes: string[];
  comments: PostComment[];
}
export interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string;
  bg: string;
  created_at: string;
  author?: string;
}

export const STORY_BACKGROUNDS = [
  "linear-gradient(135deg,#0c635c,#16998a)",
  "linear-gradient(135deg,#16998a,#ff6b4a)",
  "linear-gradient(135deg,#ff6b4a,#ffb340)",
  "linear-gradient(135deg,#ffb340,#e84f2e)",
  "linear-gradient(135deg,#0b2f2a,#0c635c)",
  "linear-gradient(135deg,#e84f2e,#0e7c72)",
];

export const STORY_TTL = 24 * 60 * 60 * 1000;

/* ============ وضع التخزين: سحابي لو الجداول موجودة، محلي otherwise ============ */
let modeCache: "cloud" | "local" | null = null;
export async function socialMode(): Promise<"cloud" | "local"> {
  if (modeCache) return modeCache;
  const { error } = await sb.from("posts").select("id").limit(1);
  modeCache = error ? "local" : "cloud";
  return modeCache;
}
export function resetSocialMode() { modeCache = null; }

/* ================= ضغط الصور ================= */
export function compressImage(file: File, maxPx = 1080, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("الصورة مش صالحة")); };
    img.src = url;
  });
}

// نحاول نرفع للصندوق السحابي، ولو الصلاحيات رفضت نستخدم الصورة المدمجة
async function storeImage(dataUrl: string, uid: string): Promise<string> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `social/${uid}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from("chat-media").upload(path, blob, { contentType: "image/jpeg" });
    if (!error) {
      const { data } = await sb.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) return data.signedUrl;
    }
  } catch { /* fallback */ }
  return dataUrl;
}

/* ================= التخزين المحلي ================= */
const LS = {
  posts: "vibe-posts",
  stories: "vibe-stories",
};
function lsGet<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
}
function lsSet(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* المساحة خلصت */ }
}

/* ================= أسماء المؤلفين ================= */
const nameCache = new Map<string, string>();
async function withNames<T extends { user_id: string }>(rows: T[]): Promise<T[]> {
  const need = [...new Set(rows.map((r) => r.user_id))].filter((id) => id && !nameCache.has(id));
  if (need.length) {
    const { data } = await sb.from("profiles").select("id,display_name,phone").in("id", need);
    (data || []).forEach((p: any) => nameCache.set(p.id, p.display_name || showPhone(p.phone) || "مستخدم"));
  }
  return rows.map((r) => ({ ...r, author: nameCache.get(r.user_id) || "مستخدم" }));
}
export function cachedName(id: string) { return nameCache.get(id); }

/* ================= البوستات ================= */
export async function fetchPosts(): Promise<Post[]> {
  const mode = await socialMode();
  if (mode === "local") {
    const posts = lsGet<Post>(LS.posts);
    return withNames(posts).then((p) => p.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  const { data, error } = await sb.from("posts").select("*").order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  const posts: Post[] = (data || []).map((p: any) => ({ ...p, likes: [], comments: [] }));
  const ids = posts.map((p) => p.id);
  if (ids.length) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      sb.from("post_likes").select("post_id,user_id").in("post_id", ids),
      sb.from("post_comments").select("*").in("post_id", ids).order("created_at", { ascending: true }),
    ]);
    (likes || []).forEach((l: any) => { posts.find((p) => p.id === l.post_id)?.likes.push(l.user_id); });
    const cs: PostComment[] = comments || [];
    await withNames(cs);
    cs.forEach((c) => {
      c.author = nameCache.get(c.user_id) || "مستخدم";
      posts.find((p) => p.id === c.post_id)?.comments.push(c);
    });
  }
  return withNames(posts);
}

export async function createPost(uid: string, caption: string, imageDataUrl: string | null): Promise<void> {
  const image_url = imageDataUrl ? await storeImage(imageDataUrl, uid) : null;
  const mode = await socialMode();
  if (mode === "local") {
    const posts = lsGet<Post>(LS.posts);
    posts.unshift({ id: crypto.randomUUID(), user_id: uid, caption, image_url, created_at: new Date().toISOString(), likes: [], comments: [] });
    lsSet(LS.posts, posts.slice(0, 100));
    return;
  }
  const { error } = await sb.from("posts").insert({ user_id: uid, caption, image_url });
  if (error) throw error;
}

export async function deletePost(post: Post): Promise<void> {
  if ((await socialMode()) === "local") {
    lsSet(LS.posts, lsGet<Post>(LS.posts).filter((p) => p.id !== post.id));
    return;
  }
  const { error } = await sb.from("posts").delete().eq("id", post.id);
  if (error) throw error;
}

export async function toggleLike(post: Post, uid: string): Promise<void> {
  const liked = post.likes.includes(uid);
  if ((await socialMode()) === "local") {
    const posts = lsGet<Post>(LS.posts);
    const p = posts.find((x) => x.id === post.id);
    if (p) p.likes = liked ? p.likes.filter((u) => u !== uid) : [...p.likes, uid];
    lsSet(LS.posts, posts);
    return;
  }
  if (liked) await sb.from("post_likes").delete().eq("post_id", post.id).eq("user_id", uid);
  else await sb.from("post_likes").insert({ post_id: post.id, user_id: uid });
}

export async function addComment(post: Post, uid: string, body: string): Promise<void> {
  if ((await socialMode()) === "local") {
    const posts = lsGet<Post>(LS.posts);
    const p = posts.find((x) => x.id === post.id);
    p?.comments.push({ id: crypto.randomUUID(), post_id: post.id, user_id: uid, body, created_at: new Date().toISOString() });
    lsSet(LS.posts, posts);
    return;
  }
  const { error } = await sb.from("post_comments").insert({ post_id: post.id, user_id: uid, body });
  if (error) throw error;
}

/* ================= الحالات (24 ساعة) ================= */
export async function fetchStories(): Promise<Story[]> {
  const cutoff = Date.now() - STORY_TTL;
  const mode = await socialMode();
  if (mode === "local") {
    const alive = lsGet<Story>(LS.stories).filter((s) => new Date(s.created_at).getTime() > cutoff);
    lsSet(LS.stories, alive);
    return withNames(alive).then((s) => s.sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }
  const { data, error } = await sb.from("stories").select("*")
    .gt("created_at", new Date(cutoff).toISOString())
    .order("created_at", { ascending: true }).limit(200);
  if (error) throw error;
  return withNames(data || []);
}

export async function createStory(uid: string, caption: string, bg: string, imageDataUrl: string | null): Promise<void> {
  const image_url = imageDataUrl ? await storeImage(imageDataUrl, uid) : null;
  if ((await socialMode()) === "local") {
    const stories = lsGet<Story>(LS.stories);
    stories.push({ id: crypto.randomUUID(), user_id: uid, caption, bg, image_url, created_at: new Date().toISOString() });
    lsSet(LS.stories, stories);
    return;
  }
  const { error } = await sb.from("stories").insert({ user_id: uid, caption, bg, image_url });
  if (error) throw error;
}

export async function deleteStory(story: Story): Promise<void> {
  if ((await socialMode()) === "local") {
    lsSet(LS.stories, lsGet<Story>(LS.stories).filter((s) => s.id !== story.id));
    return;
  }
  const { error } = await sb.from("stories").delete().eq("id", story.id);
  if (error) throw error;
}

export function timeAgo(t: string): string {
  const s = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return "دلوقتي";
  if (s < 3600) return `من ${Math.floor(s / 60)} د`;
  if (s < 86400) return `من ${Math.floor(s / 3600)} س`;
  return `من ${Math.floor(s / 86400)} يوم`;
}
export function storyTimeLeft(t: string): string {
  const ms = new Date(t).getTime() + STORY_TTL - Date.now();
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `فاضل ${h} ساعة` : `فاضل ${Math.max(1, Math.floor(ms / 60000))} دقيقة`;
}

/* ================= SQL تجهيز جداول السوشيال (للوحة المطوّر) ================= */
export const SOCIAL_SQL = `-- فعّل السوشيال في VibeChat: شغّل السكريبت ده مرة واحدة في Supabase SQL Editor
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text default '',
  image_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  caption text default '',
  bg text default 'linear-gradient(135deg,#0c635c,#16998a)',
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.stories enable row level security;
create policy "posts_read" on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts_delete" on public.posts for delete to authenticated using (auth.uid() = user_id);
create policy "likes_read" on public.post_likes for select to authenticated using (true);
create policy "likes_insert" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "likes_delete" on public.post_likes for delete to authenticated using (auth.uid() = user_id);
create policy "comments_read" on public.post_comments for select to authenticated using (true);
create policy "comments_insert" on public.post_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "stories_read" on public.stories for select to authenticated using (true);
create policy "stories_insert" on public.stories for insert to authenticated with check (auth.uid() = user_id);
create policy "stories_delete" on public.stories for delete to authenticated using (auth.uid() = user_id);`;