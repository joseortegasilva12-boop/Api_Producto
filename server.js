// server.js
import express from "express";
import { db } from "./db.js";

const app = express();
app.use(express.json());

// 1. GET /productos (devuelve todos, con filtro opcional por precio máximo)
app.get("/productos", async (req, res) => {
  try {
    const { max } = req.query;
    let filas;
    if (max !== undefined) {
      [filas] = await db.query("SELECT * FROM productos WHERE precio <= ?", [Number(max)]);
    } else {
      [filas] = await db.query("SELECT * FROM productos");
    }
    res.status(200).json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// 2. GET /productos/:id (devuelve uno)
app.get("/productos/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [filas] = await db.query("SELECT * FROM productos WHERE id = ?", [id]);
    if (filas.length === 0) {
      return res.status(404).json({ error: "No existe" });
    }
    res.status(200).json(filas[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// 3. POST /productos (crea uno nuevo)
app.post("/productos", async (req, res) => {
  const { nombre, precio, stock = 0 } = req.body;

  if (!nombre || precio === undefined || precio < 0 || stock < 0) {
    return res.status(400).json({ error: "Faltan datos o no son válidos" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)",
      [nombre, precio, stock]
    );
    res.status(201).json({ id: result.insertId, nombre, precio, stock });
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// 4. PUT /productos/:id (reemplaza TODOS los campos)
app.put("/productos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, precio, stock } = req.body;

  if (
    !nombre ||
    precio === undefined ||
    stock === undefined ||
    precio < 0 ||
    stock < 0
  ) {
    return res.status(400).json({ error: "PUT exige todos los campos válidos" });
  }

  try {
    const [result] = await db.query(
      "UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?",
      [nombre, precio, stock, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No existe" });
    }
    res.status(200).json({ id, nombre, precio, stock });
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// 5. PATCH /productos/:id (cambia solo algunos campos)
app.patch("/productos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, precio, stock } = req.body;

  if (nombre !== undefined && !nombre) {
    return res.status(400).json({ error: "Nombre no válido" });
  }
  if (precio !== undefined && precio < 0) {
    return res.status(400).json({ error: "Precio no válido" });
  }
  if (stock !== undefined && stock < 0) {
    return res.status(400).json({ error: "Stock no válido" });
  }

  // Armamos el UPDATE solo con los campos que llegaron
  const campos = [];
  const valores = [];
  if (nombre !== undefined) { campos.push("nombre = ?"); valores.push(nombre); }
  if (precio !== undefined) { campos.push("precio = ?"); valores.push(precio); }
  if (stock !== undefined)  { campos.push("stock = ?");  valores.push(stock); }

  if (campos.length === 0) {
    return res.status(400).json({ error: "No enviaste ningún campo para cambiar" });
  }

  try {
    const [result] = await db.query(
      `UPDATE productos SET ${campos.join(", ")} WHERE id = ?`,
      [...valores, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No existe" });
    }
    const [filas] = await db.query("SELECT * FROM productos WHERE id = ?", [id]);
    res.status(200).json(filas[0]);
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// 6. DELETE /productos/:id (borra el producto)
app.delete("/productos/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [result] = await db.query("DELETE FROM productos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No existe" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

app.listen(3000, () => console.log("Servidor escuchando en http://localhost:3000"));