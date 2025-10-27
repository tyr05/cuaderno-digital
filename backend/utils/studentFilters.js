// utils/studentFilters.js
// Helper utilities shared between student-related models and routes to keep
// normalization logic in a single place.
export function normalizeValue(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function normalizeForCompare(value) {
  const normalized = normalizeValue(value);
  return normalized.toLowerCase();
}

export function normalizeCursoForCompare(value) {
  const normalized = normalizeForCompare(value);
  if (!normalized) return "";

  const digitsOnly = normalized.replace(/[^0-9]/g, "");
  if (digitsOnly) return digitsOnly;

  return normalized.replace(/[º°]/g, "").replace(/\s+/g, "");
}

export function buildComparableValues(raw) {
  if (raw === undefined || raw === null) return [];

  const values = new Set();
  const asString = String(raw).trim();
  if (asString) {
    values.add(asString);
    const asNumber = Number(asString);
    if (!Number.isNaN(asNumber)) {
      values.add(asNumber);
    }
  }

  if (typeof raw === "number" && !Number.isNaN(raw)) {
    values.add(raw);
    values.add(String(raw));
  }

  return Array.from(values);
}

export function buildFieldFilter(raw) {
  const values = buildComparableValues(raw);
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];
  return { $in: values };
}

export function buildCursoFilter(...rawValues) {
  const values = new Set();

  rawValues.forEach((raw) => {
    buildComparableValues(raw).forEach((val) => {
      if (val !== "" && val !== undefined && val !== null) {
        values.add(val);
      }
    });

    const asString = String(raw ?? "").trim();
    if (asString) {
      values.add(asString);
      const withoutOrdinal = asString.replace(/[º°]/g, "").trim();
      if (withoutOrdinal) {
        values.add(withoutOrdinal);
        const numeric = Number(withoutOrdinal);
        if (!Number.isNaN(numeric)) {
          values.add(numeric);
        }
      }

      const digitsOnly = asString.replace(/[^0-9]/g, "");
      if (digitsOnly) {
        values.add(digitsOnly);
        values.add(`${digitsOnly}°`);
        values.add(`${digitsOnly}º`);
        const asNumber = Number(digitsOnly);
        if (!Number.isNaN(asNumber)) {
          values.add(asNumber);
        }
      }
    }
  });

  const result = Array.from(values).filter((val) => val !== "");
  if (result.length === 0) return undefined;
  if (result.length === 1) return result[0];
  return { $in: result };
}

export function buildCursoComparableFilter(...rawValues) {
  const values = new Set();
  rawValues.forEach((raw) => {
    const comparable = normalizeCursoForCompare(raw);
    if (comparable) values.add(comparable);
  });

  const arr = Array.from(values).filter(Boolean);
  if (arr.length === 0) return undefined;
  if (arr.length === 1) return arr[0];
  return { $in: arr };
}

export function buildDivisionComparableFilter(raw) {
  const comparable = normalizeForCompare(raw);
  return comparable || undefined;
}

export function studentMatchesCurso(student, cursoDoc) {
  if (!student || !cursoDoc) return false;

  const studentCursoComparable = normalizeCursoForCompare(
    student.cursoComparable ?? student.curso,
  );
  const cursoTargets = [cursoDoc.anio, cursoDoc.nombre]
    .map((value) => normalizeCursoForCompare(value))
    .filter(Boolean);

  if (cursoTargets.length && (!studentCursoComparable || !cursoTargets.includes(studentCursoComparable))) {
    return false;
  }

  const cursoDivision = buildDivisionComparableFilter(cursoDoc.division);
  if (!cursoDivision) return true;

  const studentDivisionComparable = normalizeForCompare(
    student.divisionComparable ?? student.division,
  );
  return studentDivisionComparable === cursoDivision;
}
