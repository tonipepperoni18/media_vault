import dotenv from "dotenv";
import express from "express";
import cors from "cors";
dotenv.config();
import { pool } from "./db.js";
import itemsRoutes from "./routes.items.js";



const app = express()
app.use(cors());
app.use(express.json());
const port = 5050



app.use("/api/items", itemsRoutes);


app.listen(port, () => console.log(`Server started on port ${port}`))