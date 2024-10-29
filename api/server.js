import express from "express";
import cors from "cors";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import pool from "./connection.js";

const app = express();
const port = 8000;

app.use(express.json());
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

// GET endpoints

app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM users;`);
    return res.status(200).send(result.rows);
  } catch (error) {
    console.error("Error while fetching users:", error);
    return res.status(500).send({ message: "Internal server error", error: error.message });
  }
});

app.get("/user/:name", async (req, res) => {
  try {
    const search = req.params.name; 
    console.log(search.split(" ")); 
    let foundUsers = [];
    let substrings = search.split(" ");

    for (const subString of substrings) {
      const result = await pool.query(
        "SELECT * FROM users WHERE name ILIKE $1",
        [`%${subString}%`]
      );

      if (result.rows.length > 0) {
        foundUsers = [...foundUsers, ...result.rows]; 
      }
    }


    foundUsers = foundUsers.filter(
      (user, index, self) =>
        index === self.findIndex((u) => u.id === user.id)
    );

   
    if (foundUsers.length > 0) {
      res.status(200).json(foundUsers);
    } else {
      res.status(404).send("Nenhum usuário encontrado");
    }
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).send("Erro interno do servidor");
  }
});


app.get("/posts", async (req, res) => {
  try {
    const postData = await pool.query(`
      SELECT p.*, u.name, u.image
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50;
    `);
    
    const posts = postData.rows;

    const postsComTipoMidia = await Promise.all(
      posts.map(async post => {
        let mime = null;
        if (post.midia) {
          const fileType = await fileTypeFromBuffer(post.midia);
          mime = fileType?.mime || "unknown";
        }
        
        return { ...post, mime };
      })
    );

    res.status(200).json(postsComTipoMidia);
  } catch (error) {
    console.error("Erro ao processar a requisição:", error);
    res.status(500).json({ error: "Erro ao processar a requisição." });
  }
});

app.get("/midia-post/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT midia FROM posts WHERE id = $1",
      [id]
    );
    const midia = result.rows[0]?.midia;

    if (!midia) {
      return res.status(404).send("Midia não encontrada");
    }

    const type = await fileTypeFromBuffer(midia);

    if (!type) {
      return res.status(400).send("Tipo de mídia desconhecido");
    }

    res.set("Content-Type", type.mime);
    res.send(midia);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar a imagem");
  }
});

app.get("/user-img/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT image FROM users WHERE id = $1",
      [id]
    );
    const image = result.rows[0]?.image;

    if (!image) {
      return res.status(404).send("Imagem não encontrada");
    }

    res.set("Content-Type", "image/jpeg");
    res.send(image);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar a imagem");
  }
});

// POST endpoints

app.post("/users/add", async (req, res) => {
  try {
    const { name, email, password, image = null } = req.body;

    const result = await pool.query(
      `INSERT INTO users (name, email, password, image) 
       VALUES ($1, $2, $3, $4) RETURNING *;`,
      [name, email, password, image]
    );

    return res.status(200).send(result.rows[0]);
  } catch (error) {
    console.error("Error while adding user:", error);
    return res.status(500).send({ message: "Internal server error", error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    await pool.query(
      `
      INSERT INTO users 
      (name, email, password, phone)
      VALUES
      ($1, $2, $3, $4);`,
      [name, email, password, phone]
    );

    const result = await pool.query(
      `SELECT id FROM users WHERE email = $1;`,
      [email]
    );
    const id = result.rows[0].id;

    res.status(201).send({ name, email, phone, id });
  } catch (error) {
    console.log(error);
    res.sendStatus(409);
  }
});


app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND password = $2;`,
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return res.status(200).send(user);
    } else {
      return res.status(401).send({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/posts", upload.single("midia"), async (req, res) => {
  try {
    const { description, user_id } = req.body;
    const midia = req.file ? req.file.buffer : null;

    const timestamp = new Date().toISOString();

    if (midia && description) {
      await pool.query(
        `INSERT INTO posts (midia, description, created_at, user_id) VALUES ($1, $2, $3, $4);`,
        [midia, description, timestamp, user_id]
      );
    } else if (midia) {
      await pool.query(
        `INSERT INTO posts (midia, created_at, user_id) VALUES ($1, $2, $3);`,
        [midia, timestamp, user_id]
      );
    } else if (description) {
      await pool.query(
        `INSERT INTO posts (description, created_at, user_id) VALUES ($1, $2, $3);`,
        [description, timestamp, user_id]
      );
    } else {
      return res.status(400).send("Nenhuma mídia ou descrição recebida");
    }

    res.status(201).send("Post criado com sucesso");
  } catch (error) {
    console.error("Erro ao processar a requisição:", error);
    res.status(500).send("Erro interno do servidor");
  }
});

// Listen

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
