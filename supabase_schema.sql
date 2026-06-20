-- Crear tabla de proyectos de tours virtuales
CREATE TABLE IF NOT EXISTS claurv_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_public BOOLEAN DEFAULT true NOT NULL,
    scenes JSONB DEFAULT '{}'::jsonb NOT NULL,
    default_scene TEXT DEFAULT '',
    media_library JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE claurv_projects ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso para claurv_projects
-- 1. Permitir lectura a todos (invitados y admins)
CREATE POLICY "Permitir lectura de proyectos públicos" 
ON claurv_projects FOR SELECT 
USING (is_public = true);

-- 2. Permitir lectura de proyectos privados solo a usuarios autenticados o administradores
CREATE POLICY "Permitir lectura total a administradores" 
ON claurv_projects FOR SELECT 
TO authenticated 
USING (true);

-- 3. Control total para escritura (insert, update, delete) solo a administradores autenticados
CREATE POLICY "Permitir inserción a administradores" 
ON claurv_projects FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir actualización a administradores" 
ON claurv_projects FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir eliminación a administradores" 
ON claurv_projects FOR DELETE 
TO authenticated 
USING (true);

-- Nota: También debes crear un Bucket en Supabase Storage llamado 'claurv-panoramas' 
-- y configurarlo como PÚBLICO para poder almacenar las fotos 360° y compartirlas.
