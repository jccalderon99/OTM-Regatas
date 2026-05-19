-- ============================================================
-- OTM-REGATAS: Datos Iniciales (Seed)
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- =====================
-- ÁREAS DEL CLUB (32)
-- =====================
INSERT INTO master_data (type, name, sort_order) VALUES
  ('area', '01. ACTIVIDADES CULTURALES', 1),
  ('area', '02. ADMINISTRACIÓN Y FINANZAS', 2),
  ('area', '03. CONTABILIDAD', 3),
  ('area', '04. CONTROL DE BIENES PATRIMONIAL', 4),
  ('area', '05. PRESUPUESTO', 5),
  ('area', '06. TESORERÍA Y CUENTAS POR COBRAR', 6),
  ('area', '07. ALOJAMIENTO', 7),
  ('area', '08. BAÑOS TURCOS', 8),
  ('area', '09. COMUNICACIONES', 9),
  ('area', '10. CONCESIONES', 10),
  ('area', '11. CONSEJO DIRECTIVO', 11),
  ('area', '12. CONTROL Y AUDITORIA', 12),
  ('area', '13. DEPORTES', 13),
  ('area', '14. EVENTOS', 14),
  ('area', '15. GERENCIA GENERAL', 15),
  ('area', '16. GESTIÓN HUMANA', 16),
  ('area', '17. HOSPITALIDAD', 17),
  ('area', '18. INFORMÁTICA', 18),
  ('area', '19. JUNTA CALIFICADORA', 19),
  ('area', '20. LEGAL', 20),
  ('area', '21. LOGÍSTICA', 21),
  ('area', '22. MANTENIMIENTO', 22),
  ('area', '23. PROGRAMA ADULTO MAYOR', 23),
  ('area', '24. PROYECTOS', 24),
  ('area', '25. REGISTRO DE ASOCIADOS', 25),
  ('area', '26. REMO', 26),
  ('area', '27. SEGURIDAD', 27),
  ('area', '28. SERVICIOS AL ASOCIADO', 28),
  ('area', '29. SERVICIOS GENERALES', 29),
  ('area', '30. TRANSPORTE', 30),
  ('area', '31. URGENCIAS MÉDICAS', 31),
  ('area', '32. VICEPRESIDENCIA', 32)
ON CONFLICT (type, name) DO NOTHING;

-- =====================
-- ESPECIALIDADES (7)
-- =====================
INSERT INTO master_data (type, name, sort_order) VALUES
  ('specialty', '01. Albañilería', 1),
  ('specialty', '02. Carpintería', 2),
  ('specialty', '03. Electricidad', 3),
  ('specialty', '04. Gasfitería', 4),
  ('specialty', '05. Pintura', 5),
  ('specialty', '06. Jardinería', 6),
  ('specialty', '07. Otros', 7)
ON CONFLICT (type, name) DO NOTHING;

-- =====================
-- UBICACIONES (56)
-- =====================
INSERT INTO master_data (type, name, sort_order) VALUES
  ('location', '01. Ingreso principal', 1),
  ('location', '02. Ingreso - Casetas de Seguridad', 2),
  ('location', '03. Departamento de Seguridad', 3),
  ('location', '04. Módulo administrativo', 4),
  ('location', '05. Comedor de empleados', 5),
  ('location', '06. Zona de bancos', 6),
  ('location', '07. Puerta N°2 Salida emergencia', 7),
  ('location', '08. Departamento médico (Tópico 1)', 8),
  ('location', '09. Cancha de futbol y basquet', 9),
  ('location', '10. Coliseo de basquet', 10),
  ('location', '11. Departamento de Nautico', 11),
  ('location', '12. Galpon de botes', 12),
  ('location', '13. Muelle Náutico', 13),
  ('location', '14. Restaurante ZsaZsa', 14),
  ('location', '15. Playa N° 1', 15),
  ('location', '16. Terraza N° 1', 16),
  ('location', '17. Edificio de servicios', 17),
  ('location', '18. Delegaciones (Dormitorio bogas)', 18),
  ('location', '19. Bar senior', 19),
  ('location', '20. Restaurante Los Bachiches', 20),
  ('location', '21. Hall principal', 21),
  ('location', '22. Restaurante 1875', 22),
  ('location', '23. Zona de peluquerías', 23),
  ('location', '24. Zona de Remos', 24),
  ('location', '25. Comedor de servicios', 25),
  ('location', '26. Media luna', 26),
  ('location', '27. Auditorio', 27),
  ('location', '28. Cancha de Squash', 28),
  ('location', '29. Puerta N°3 (puente)', 29),
  ('location', '30. Edificio 7 pisos', 30),
  ('location', '31. Piscina Olimpica y Patera', 31),
  ('location', '32. Camerín de bebes', 32),
  ('location', '33. Juego de niños', 33),
  ('location', '34. Restaurantes San Telmo y El Parador', 34),
  ('location', '35. Espigón N° 1', 35),
  ('location', '36. Playa N° 2', 36),
  ('location', '37. Restaurante los Remos', 37),
  ('location', '38. Coliseo de voley', 38),
  ('location', '39. Coliseo de bochas', 39),
  ('location', '40. Cancha de frontón', 40),
  ('location', '41. Terraza N° 2', 41),
  ('location', '42. Coliseo de badminton', 42),
  ('location', '43. Tópico 02', 43),
  ('location', '44. Edificio estacionamiento', 44),
  ('location', '45. Playa de estacionamiento', 45),
  ('location', '46. Edificio de baile', 46),
  ('location', '47. Vestuario playa N°3', 47),
  ('location', '48. Zona de comida - restaurantes', 48),
  ('location', '49. Embarcadero 41', 49),
  ('location', '50. Capirena', 50),
  ('location', '51. Playa N° 3', 51),
  ('location', '52. Espigón 2', 52),
  ('location', '53. Edificio cultural', 53),
  ('location', '54. Ruta caminante 3', 54),
  ('location', '55. Mastil', 55),
  ('location', '56. Polideportivo - al exterior del Club', 56)
ON CONFLICT (type, name) DO NOTHING;
