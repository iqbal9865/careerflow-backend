import dotenv from "dotenv";

dotenv.config();

import "./config/db.js";
import app from "./app.js";
import authRoutes from "./modules/auth/auth.route.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Career Flow backend is running!");
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})
