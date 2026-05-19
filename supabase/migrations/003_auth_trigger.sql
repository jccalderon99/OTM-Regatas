-- ============================================================
-- OTM-REGATAS: Sincronización de Usuarios (Auth Trigger)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Este trigger copia automáticamente cualquier nuevo usuario creado
-- en Supabase Authentication hacia la tabla 'profiles'.
-- Permite que al crear un usuario en el Dashboard de Supabase,
-- este tenga inmediatamente su perfil funcional.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'requester')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existía para evitar duplicados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
