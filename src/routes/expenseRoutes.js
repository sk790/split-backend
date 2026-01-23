const express = require("express");
const router = express.Router();
const {
  addExpense,
  getGroupExpenses,
  getGroupBalances,
  editExpense,
  deleteExpense,
  getUserExpenses,
} = require("../controllers/expenseController.js");
const { protect } = require("../middleware/authMiddleware.js");

router.use(protect); // All routes require authentication

router.route("/user/expenses").get(getUserExpenses);

router.route("/:id/expenses").post(addExpense).get(getGroupExpenses);

router.route("/:id/balances").get(getGroupBalances);

router
  .route("/:groupId/expenses/:expenseId")
  .put(editExpense)
  .delete(deleteExpense);

module.exports = router;
