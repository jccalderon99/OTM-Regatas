-- ==========================================
-- 1. CREAR TABLA DE PERFILES DE USUARIO
-- ==========================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver los perfiles (para poder mostrar los nombres en los proyectos públicos)
CREATE POLICY "Lectura publica de perfiles" ON user_profiles FOR SELECT USING (true);

-- Solo los administradores pueden actualizar cualquier perfil (para aprobarlos)
CREATE POLICY "Admin actualiza perfiles" ON user_profiles FOR UPDATE TO authenticated 
USING ( (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' );

-- Los usuarios pueden actualizar su propio perfil (sus nombres)
CREATE POLICY "Usuario actualiza su perfil" ON user_profiles FOR UPDATE TO authenticated 
USING ( id = auth.uid() );


-- ==========================================
-- 2. AUTOMATIZAR CREACIÓN DE PERFIL AL REGISTRARSE
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Si el correo es el tuyo, se crea directamente como Admin y Aprobado
    IF NEW.email = 'jccalderon@clubregatas.org.pe' THEN
        INSERT INTO public.user_profiles (id, email, first_name, last_name, role, status)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', 'admin', 'approved');
    ELSE
        -- Cualquier otro correo entra como Usuario normal y Pendiente de aprobación
        INSERT INTO public.user_profiles (id, email, first_name, last_name, role, status)
        VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', 'user', 'pending');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si existe para recrearlo limpio
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 3. ACTUALIZAR TABLA DE PROYECTOS (Añadir Dueño y Colaboradores)
-- ==========================================
-- Si la tabla claurv_projects no tiene las columnas, se las agregamos
ALTER TABLE claurv_projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE claurv_projects ADD COLUMN IF NOT EXISTS collaborators UUID[] DEFAULT '{}'::UUID[];

-- Actualizar las políticas de seguridad de proyectos
DROP POLICY IF EXISTS "Permitir lectura de proyectos públicos" ON claurv_projects;
DROP POLICY IF EXISTS "Permitir lectura total a administradores" ON claurv_projects;
DROP POLICY IF EXISTS "Permitir inserción a administradores" ON claurv_projects;
DROP POLICY IF EXISTS "Permitir actualización a administradores" ON claurv_projects;
DROP POLICY IF EXISTS "Permitir eliminación a administradores" ON claurv_projects;
DROP POLICY IF EXISTS "Permitir todo el acceso" ON claurv_projects;

-- Lectura: Públicos, tuyos, o en los que colaboras
CREATE POLICY "Lectura de proyectos" ON claurv_projects FOR SELECT USING (
    is_public = true 
    OR owner_id = auth.uid() 
    OR auth.uid() = ANY(collaborators)
    OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- Inserción: Solo si tu perfil está aprobado y eres el owner
CREATE POLICY "Creacion de proyectos" ON claurv_projects FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT status FROM user_profiles WHERE id = auth.uid()) = 'approved'
);

-- Actualización: Solo dueños o colaboradores
CREATE POLICY "Edicion de proyectos" ON claurv_projects FOR UPDATE TO authenticated USING (
    (owner_id = auth.uid() OR auth.uid() = ANY(collaborators))
    AND (SELECT status FROM user_profiles WHERE id = auth.uid()) = 'approved'
);

-- Eliminación: Solo el dueño
CREATE POLICY "Eliminacion de proyectos" ON claurv_projects FOR DELETE TO authenticated USING (
    owner_id = auth.uid()
    AND (SELECT status FROM user_profiles WHERE id = auth.uid()) = 'approved'
);


-- ==========================================
-- 4. TABLA DE NOTIFICACIONES/TRANSFERENCIAS (Compartir Proyectos)
-- ==========================================
CREATE TABLE IF NOT EXISTS project_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_email TEXT NOT NULL,
    project_id TEXT NOT NULL, -- ID del proyecto original
    project_data JSONB,       -- Copia completa del JSON del proyecto por si lo modifican antes de que acepte
    type TEXT CHECK (type IN ('copy', 'collaboration')) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE project_transfers ENABLE ROW LEVEL SECURITY;

-- Lectura: Solo puedes ver los que enviaste o los que te enviaron a tu correo
CREATE POLICY "Ver transferencias" ON project_transfers FOR SELECT TO authenticated USING (
    sender_id = auth.uid() 
    OR receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Inserción: Solo puedes insertar si tú eres el remitente y tu cuenta está aprobada
CREATE POLICY "Crear transferencia" ON project_transfers FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND (SELECT status FROM user_profiles WHERE id = auth.uid()) = 'approved'
);

-- Actualización: Solo el receptor puede aceptar/rechazar (cambiar el status)
CREATE POLICY "Aceptar rechazar transferencia" ON project_transfers FOR UPDATE TO authenticated USING (
    receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
