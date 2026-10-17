
import "dotenv/config";
import app from "./app.js";
import authRoutes from "./modules/auth/auth.route.js";
import profileRoutes from './modules/profile/profile.route.js';
import applicationRoutes from "./modules/application/application.route.js";
import taskRoutes from "./modules/task/task.route.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Career Flow backend is running!");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes)
app.use("/api/v1/applications", applicationRoutes);
app.use("/api/v1/tasks", taskRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})
