# Backend

## Seed de cursos

El script `seedCursos` genera (o actualiza, si ya existen) los cursos base del sistema
combinando:

- Años: 1 a 5
- Divisiones: `1` y `2`
- Turnos: `TM` y `TT`

El proceso es **idempotente** gracias al uso de `Curso.updateOne(..., { upsert: true })`,
por lo que puede ejecutarse múltiples veces sin crear duplicados.

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
VITE_API_URL=http://localhost:5000
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

### Flujo de prueba manual

1. Crear o importar estudiantes con códigos ejecutando `node scripts/import_students_with_codes.js ./ruta/al/archivo.csv`.
2. Iniciar sesión como familia (`/api/auth/login`) para obtener un token JWT.
3. Enviar `POST /api/familias/vinculos` con `{ "codigo": "AAA-00-000" }` y el header `Authorization: Bearer <token>`.
4. Consultar `GET /api/familias/mis-hijos` y verificar que el estudiante aparezca.
5. Opcional: probar `DELETE /api/familias/vinculos/:studentId` para desvincular.

La colección `docs/postman/vinculacion.postman_collection.json` contiene las cuatro requests listas para ejecutar (login, vincular, listar, eliminar). Importarla en Postman y actualizar las variables `baseUrl`, `codigo` y credenciales.

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
