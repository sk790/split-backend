require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/database.js");

// Import routes
const authRoutes = require("./src/routes/authRoutes.js");
const groupRoutes = require("./src/routes/groupRoutes.js");
const expenseRoutes = require("./src/routes/expenseRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");
const walletRoutes = require("./src/routes/walletRoutes.js");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/groups", expenseRoutes);
app.use("/api/user", userRoutes);
app.use("/api/wallet", walletRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
