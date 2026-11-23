// auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const router = Router();

// POST /register: crea un usuario con la clave en hash
router.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO usuarios (email, password) VALUES (?, ?)",
      [email, hash]
    );
    res.status(201).json({ id: result.insertId, email, rol: "usuario" });
  } catch (error) {
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(400).json({ error: "Ese email ya está registrado" });
  }
  res.status(500).json({ error: "Error en la base de datos" });
}
});

// POST /login: si todo está bien, entrega el token
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const [filas] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    const usuario = filas[0];
    if (!usuario) {
      return res.status(401).json({ error: "Email o clave incorrectos" });
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return res.status(401).json({ error: "Email o clave incorrectos" });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({ token });
  } catch (error) {
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(400).json({ error: "Ese email ya está registrado" });
  }
  res.status(500).json({ error: "Error en la base de datos" });
}
});

// Middleware: revisa que llegue un token válido
export function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = header.split(" ")[1];
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o vencido" });
  }
}

export default router;