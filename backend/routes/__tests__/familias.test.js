import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";
import app from "../../app.js";
import Student from "../../models/Student.js";
import FamilyStudent from "../../models/FamilyStudent.js";

function authHeader(user) {
  const secret = process.env.JWT_SECRET || "test-secret";
  const token = jwt.sign(user, secret, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

describe("Familias - vinculación", () => {
  const familyId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("vincula un estudiante existente", async () => {
    const saveMock = jest.fn().mockResolvedValue();
    jest.spyOn(Student, "findOne").mockResolvedValue({
      _id: studentId,
      nombre: "Juan Perez",
      curso: 1,
      division: "A",
      codigo: "ABC-12-345",
      codigoUsado: false,
      save: saveMock,
    });
    jest.spyOn(FamilyStudent, "findOne").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const createMock = jest.spyOn(FamilyStudent, "create").mockImplementation(async (doc) => ({
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    }));

    const res = await request(app)
      .post("/api/familias/vinculos")
      .set("Authorization", authHeader({ uid: familyId, rol: "familia" }))
      .send({ codigo: "ABC-12-345" })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.student.nombre).toBe("Juan Perez");
    expect(createMock).toHaveBeenCalledWith({ familyId: String(familyId), studentId });
    expect(saveMock).toHaveBeenCalled();
  });

  it("responde 404 si el código no existe", async () => {
    jest.spyOn(Student, "findOne").mockResolvedValue(null);

    const res = await request(app)
      .post("/api/familias/vinculos")
      .set("Authorization", authHeader({ uid: familyId, rol: "familia" }))
      .send({ codigo: "XYZ-99-999" })
      .expect(404);

    expect(res.body.error).toMatch(/no corresponde/);
  });

  it("responde 409 si el estudiante ya está vinculado", async () => {
    jest.spyOn(Student, "findOne").mockResolvedValue({
      _id: studentId,
      nombre: "Ana",
      curso: 2,
      division: "B",
      codigo: "DEF-22-333",
      codigoUsado: true,
      save: jest.fn(),
    });
    jest.spyOn(FamilyStudent, "findOne").mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      familyId,
      studentId,
    });

    await request(app)
      .post("/api/familias/vinculos")
      .set("Authorization", authHeader({ uid: familyId, rol: "familia" }))
      .send({ codigo: "DEF-22-333" })
      .expect(409);
  });

  it("requiere autenticación", async () => {
    const res = await request(app)
      .post("/api/familias/vinculos")
      .send({ codigo: "ABC-12-345" })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });
});
