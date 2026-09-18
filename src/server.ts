import dotenv from "dotenv";

dotenv.config();

import "./config/db.js";
import app from "./app.js";
import authRoutes from "./modules/auth/auth.route.js";
import profileRoutes from './modules/profile/profile.route.js';
import applicationRoutes from "./modules/application/application.route.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Career Flow backend is running!");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes)
app.use("/api/v1/applications", applicationRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})
