# Backend

## Seed de cursos

El script `seedCursos` genera (o actualiza, si ya existen) los cursos base del sistema
combinando:

- Años: 1 a 5
- Divisiones: `1` y `2`
- Turnos: `TM` y `TT`

El proceso es **idempotente** gracias al uso de `Curso.updateOne(..., { upsert: true })`,
por lo que puede ejecutarse múltiples veces sin crear duplicados.

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
