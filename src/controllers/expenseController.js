const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { calculateBalances } = require("../utils/balanceCalculator");

// Add expense to a group
exports.addExpense = async (req, res) => {
  try {
    const { amount, splitBetween, description } = req.body;
    console.log(req.body);

    const groupId = req.params.id;
    const paidBy = req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.includes(paidBy);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Validate splitBetween users are group members
    const validSplit = splitBetween.every((userId) =>
      group.members.some((member) => member.toString() === userId),
    );

    if (!validSplit) {
      return res.status(400).json({
        success: false,
        message: "All users in splitBetween must be group members",
      });
    }

    // Create expense
    const expense = await Expense.create({
      amount,
      paidBy,
      splitBetween,
      description,
      groupId,
    });

    await expense.populate("paidBy", "name email");
    await expense.populate("splitBetween", "name email");

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all expenses in a group
exports.getGroupExpenses = async (req, res) => {
  try {
    const groupId = req.params.id;
    console.log(groupId, "g");

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const isMember = group.members.includes(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Get expenses
    const expenses = await Expense.find({ groupId })
      .populate("paidBy", "name email")
      .populate("splitBetween", "name email")
      .sort("-createdAt");

    console.log();

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Edit expense
exports.editExpense = async (req, res) => {
  try {
    const { expenseId, groupId } = req.params;
    const { amount, splitBetween, description } = req.body;
    const userId = req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.includes(userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Find expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Verify expense belongs to this group
    if (expense.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: "Expense does not belong to this group",
      });
    }

    // Verify user is the one who paid for the expense
    if (expense.paidBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit expenses you created",
      });
    }

    // Validate splitBetween users are group members
    const validSplit = splitBetween.every((memberId) =>
      group.members.some((member) => member.toString() === memberId),
    );

    if (!validSplit) {
      return res.status(400).json({
        success: false,
        message: "All users in splitBetween must be group members",
      });
    }

    // Update expense
    expense.amount = amount;
    expense.splitBetween = splitBetween;
    expense.description = description;
    await expense.save();

    await expense.populate("paidBy", "name email");
    await expense.populate("splitBetween", "name email");

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const { expenseId, groupId } = req.params;
    const userId = req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.includes(userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Find expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Verify expense belongs to this group
    if (expense.groupId.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: "Expense does not belong to this group",
      });
    }

    // Verify user is the one who paid for the expense
    if (expense.paidBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete expenses you created",
      });
    }

    // Delete expense
    await Expense.findByIdAndDelete(expenseId);

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all expenses for a single user
exports.getUserExpenses = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all expenses where user is either paidBy or in splitBetween
    const expenses = await Expense.find({
      $or: [{ paidBy: userId }, { splitBetween: userId }],
    })
      .populate("paidBy", "name email")
      .populate("splitBetween", "name email")
      .populate("groupId", "name")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get group balances
exports.getGroupBalances = async (req, res) => {
  try {
    const groupId = req.params.id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId).populate(
      "members",
      "name email",
    );
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) => member._id.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Get all expenses for the group
    const expenses = await Expense.find({ groupId })
      .populate("paidBy", "name email")
      .populate("splitBetween", "name email");

    // Calculate balances
    const balances = calculateBalances(expenses, group.members);

    res.status(200).json({
      success: true,
      data: balances,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
