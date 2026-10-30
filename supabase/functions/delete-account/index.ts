// Borrado de cuenta (spec-datos-supabase §6.3). Toma el uid del JWT del usuario, nunca de la petición, y borra con
// service_role; las tablas cuelgan de auth.users con ON DELETE CASCADE. Desplegar solo con aprobación del usuario.
import { createClient } from 'jsr:@supabase/supabase-js@2.45.4';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const authorization = req.headers.get('Authorization');
  if (!authorization) return new Response('Unauthorized', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return new Response('Unauthorized', { status: 401 });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) return new Response('Delete failed', { status: 500 });
  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
