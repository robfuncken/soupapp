import express from "express";
import cors from "cors";
import { DatabaseService } from "./services/database";

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Sample API endpoints
app.get("/api/test", (req, res) => {
  res.json({ message: "Express backend is working!" });
});

app.get("/api/soups/:date", async (req, res) => {
  const date = new Date(req.params.date);
  const soups = await DatabaseService.getSoupsForDate(date);
  res.json(soups);
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

export default app;
