import { supabaseGet, type SupabaseEnv } from "./_shared";
export const onRequest = async ({ request, env }: { request: Request; env: SupabaseEnv }) => {
  try {
    const url = new URL(request.url); const author = url.searchParams.get("author_id");
    const select = encodeURIComponent("id,author_id,card_bet_id,content,post_type,created_at,updated_at,profiles(first_name,last_name,username,avatar_url,is_pro,is_verified),match_snapshots(*)");
    let path = `posts?select=${select}&post_type=eq.match_prediction&order=created_at.desc&limit=100`;
    if (author) path += `&author_id=eq.${encodeURIComponent(author)}`;
    const response = await supabaseGet(env, path);
    if (!response.ok) return Response.json({ error: "Failed to load post cards" }, { status: 500 });
    return Response.json(await response.json());
  } catch { return Response.json({ error: "Failed to load post cards" }, { status: 500 }); }
};
