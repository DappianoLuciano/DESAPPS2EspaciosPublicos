-- Categoria del espacio publico (PLAZA, SALON, CANCHA, AUDITORIO) para EspacioPublicoAfectado.
-- Aditiva: los espacios existentes quedan con category en null.
CREATE TYPE "PublicSpaceCategory" AS ENUM ('PLAZA', 'SALON', 'CANCHA', 'AUDITORIO');
ALTER TABLE "public_spaces" ADD COLUMN "category" "PublicSpaceCategory";
