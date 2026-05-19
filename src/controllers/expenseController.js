const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { calculateBalances } = require("../utils/balanceCalculator");

// Add expense to a group
exports.addExpense = async (req, res) => {
  try {
    const { amount, splitBetween, description, paidBy, category, attachment } = req.body;
    const groupId = req.params.id;
    const paidById = paidBy || req.user._id;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) => member.toString() === paidById.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Paid user is not a member of this group",
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
      paidBy: paidById,
      splitBetween,
      description,
      groupId,
      category: category || null,
      attachment: attachment || null
    });

    await expense.populate("paidBy", "name email avatar");
    await expense.populate("splitBetween", "name email avatar");
    await expense.populate("category");

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

    // Get expenses (excluding old settlement expenses)
    const expenses = await Expense.find({ groupId, description: { $ne: "Settlement" } })
      .populate("paidBy", "name email avatar")
      .populate("splitBetween", "name email avatar")
      .populate("category")
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

// Edit expense
exports.editExpense = async (req, res) => {
  try {
    const { expenseId, groupId } = req.params;
    const { amount, splitBetween, description, paidBy, category, attachment } = req.body;
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
    if (paidBy) {
      expense.paidBy = paidBy;
    }
    if (category !== undefined) {
      expense.category = category || null;
    }
    if (attachment !== undefined) {
      expense.attachment = attachment || null;
    }
    await expense.save();

    await expense.populate("paidBy", "name email avatar");
    await expense.populate("splitBetween", "name email avatar");
    await expense.populate("category");

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

    // Soft delete expense
    expense.isDeleted = true;
    await expense.save();

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

    // Find all active groups where the user is a member
    const userGroups = await Group.find({ members: userId });
    const groupIds = userGroups.map((group) => group._id);

    // Get all expenses belonging to these groups and where user is either paidBy or in splitBetween
    const expenses = await Expense.find({
      groupId: { $in: groupIds },
      $or: [{ paidBy: userId }, { splitBetween: userId }],
    })
      .populate("paidBy", "name email avatar")
      .populate("splitBetween", "name email avatar")
      .populate("groupId", "name currency")
      .populate("category")
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

    // Get all expenses for the group (excluding old settlement expenses)
    const expenses = await Expense.find({ groupId, description: { $ne: "Settlement" } })
      .populate("paidBy", "name email avatar")
      .populate("splitBetween", "name email avatar");

    // Get all payments for the group
    const payments = await Payment.find({ groupId })
      .populate("paidBy", "name email avatar")
      .populate("paidTo", "name email avatar");

    // Calculate balances with payments incorporated
    const balances = calculateBalances(expenses, group.members, payments);

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
// Settle up amount
exports.settleUp = async (req, res) => {
  try {
    const { amount, fromUserId, toUserId } = req.body;
    const groupId = req.params.id;
    
    // Payer is the debtor (fromUserId) or the logged-in user (as fallback)
    const payerId = fromUserId || req.user._id;
    
    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if both users are members
    const isPayerMember = group.members.some(
      (member) => member.toString() === payerId.toString()
    );
    const isPayeeMember = group.members.some(
      (member) => member.toString() === toUserId.toString()
    );

    if (!isPayerMember || !isPayeeMember) {
      return res.status(403).json({
        success: false,
        message: "Both users must be group members to settle up",
      });
    }

    const settlementAmount = Math.abs(amount);
    
    // Create a real payment in Payment collection instead of an Expense
    const payment = await Payment.create({
      groupId,
      paidBy: payerId,
      paidTo: toUserId,
      amount: settlementAmount,
    });

    await payment.populate("paidBy", "name email avatar");
    await payment.populate("paidTo", "name email avatar");

    res.status(201).json({
      success: true,
      data: payment,
      message: "Settlement payment recorded successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all payments in a group
exports.getGroupPayments = async (req, res) => {
  try {
    const groupId = req.params.id;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) => member.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Get payments
    const payments = await Payment.find({ groupId })
      .populate("paidBy", "name email avatar")
      .populate("paidTo", "name email avatar")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
