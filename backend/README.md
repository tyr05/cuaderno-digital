# Backend

## Seed de cursos

El script `seedCursos` genera (o actualiza, si ya existen) los cursos base del sistema
combinando:

- Años: 1 a 5
- Divisiones: `1` y `2`
- Turnos: `TM` y `TT`

El proceso es **idempotente** gracias al uso de `Curso.updateOne(..., { upsert: true })`,
por lo que puede ejecutarse múltiples veces sin crear duplicados.

## Roles y permisos

- **Admin**: puede crear y listar anuncios, acceder al padrón completo de cursos y
  estudiantes y administrar la asignación de docentes/alumnos.
- **Docente**: puede crear anuncios para sus cursos, gestionar asistencia y consultar
  el padrón de estudiantes de la institución.
- **Familia**: puede ver anuncios dirigidos a familias, vincular y gestionar a sus
  hijos, pero **no** puede crear anuncios ni acceder al padrón general de estudiantes.

Las rutas protegidas utilizan el middleware `requireRole`, que acepta tanto `rol` como
`role` en el payload del token JWT y compara de forma case-insensitive para evitar
errores por capitalización.

## Vincular por código

### Variables de entorno requeridas

Configurar un archivo `.env` en el backend con:

```bash
MONGO_URI=mongodb://usuario:password@host:puerto/base
JWT_SECRET=clave-super-secreta
PORT=5000 # opcional
```

En el frontend añadir un `.env` con:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

### Puesta en marcha local

1. Instalar dependencias del backend y levantar la API:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. Instalar dependencias del frontend y levantar el cliente Vite:
   ```bash
   cd ../frontend
   npm install
   npm run dev -- --host
   ```
3. La aplicación quedará disponible en `http://localhost:5173` consumiendo el backend en `http://localhost:5000`.

### Pruebas manuales rápidas

Con el backend levantado, estos comandos de PowerShell permiten validar el flujo de autenticación,
listado de cursos y estudiantes:

```powershell
$base = $env:VITE_API_BASE_URL
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Headers @{ "Content-Type"="application/json" } -Body '{"email":"admin@cuaderno.com","password":"admin123"}'
$TOKEN = $login.token

Invoke-RestMethod -Uri "$base/api/cursos?ts=$(Get-Random)" -Headers @{ Authorization = "Bearer $TOKEN" } -Method Get

$CID = "<_id de cursos>"
Invoke-RestMethod -Uri "$base/api/students/by-course/$CID?ts=$(Get-Random)" -Headers @{ Authorization = "Bearer $TOKEN" } -Method Get
```

### Flujo de prueba manual

1. Crear o importar estudiantes con códigos ejecutando `node scripts/import_students_with_codes.js ./ruta/al/archivo.csv`.
2. Iniciar sesión como familia (`/api/auth/login`) para obtener un token JWT.
3. Enviar `POST /api/familias/vinculos` con `{ "codigo": "AAA-00-000" }` y el header `Authorization: Bearer <token>`.
4. Consultar `GET /api/familias/mis-hijos` y verificar que el estudiante aparezca.
5. Opcional: probar `DELETE /api/familias/vinculos/:studentId` para desvincular.

La colección `docs/postman/vinculacion.postman_collection.json` contiene las cuatro requests listas para ejecutar (login, vincular, listar, eliminar). Importarla en Postman y actualizar las variables `baseUrl`, `codigo` y credenciales.

### Consultar estudiantes por curso

1. Levantá el backend con `npm start` y autenticá un usuario docente o admin (por ejemplo con la request "Login admin" de la colección `docs/postman/admin-anuncios-estudiantes.postman_collection.json`).
2. Ejecutá `GET /api/students?cursoId=<ID_DEL_CURSO>` agregando el header `Authorization: Bearer <token>`.
   ```bash
   curl -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/students?cursoId=64f0..."
   ```
3. La respuesta devuelve un arreglo de estudiantes con `nombre`, `curso`, `division` y `codigo` listos para mostrarse en el frontend.

> La colección "Cuaderno Digital - Roles admin/docente" incluye la request **Admin obtiene estudiantes del curso** para validar rápidamente este flujo.

### Checklist de aceptación

- [x] `POST /api/familias/vinculos` valida el formato del código, exige rol familia y crea el vínculo.
- [x] `GET /api/familias/mis-hijos` devuelve los estudiantes vinculados con nombre, curso, división y código.
- [x] El frontend envía a `POST /api/familias/vinculos` con token y muestra los mensajes de error por estado `400/404/409`.
- [x] Existen índices únicos en `students.codigo` y en `(familyId, studentId)`.
- [x] La UI muestra confirmación de vinculación y refresca la lista; “Código inválido” solo se presenta ante errores reales.
- [x] Colección Postman y README actualizados.
- [x] Tests Jest/Supertest pasan en CI.

### Variables de entorno necesarias

Antes de ejecutar el seed asegurate de contar con un archivo `.env` (en la raíz del
backend) con al menos la siguiente variable:

```bash
MONGO_URI=mongodb://usuario:password@host:puerto/base
```

> `MONGO_URI` debe apuntar a la base de datos donde se crearán/actualizarán los cursos.

### Ejecución

Instala las dependencias del backend si aún no lo hiciste:

```bash
npm install
```

Luego ejecutá el seed:

```bash
npm run seed:cursos
```

El comando mostrará en consola cuántos cursos fueron creados, actualizados o estaban ya
sin cambios.
