const Group = require("../models/Group");
const User = require("../models/User");
const Expense = require("../models/Expense");
const { calculateBalances } = require("../utils/balanceCalculator");

exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const createdBy = req.user._id;
    members.push(createdBy.toString());
    if (members && members.length > 0) {
      const validMembers = await User.find({ _id: { $in: members } });
      if (validMembers.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid member IDs",
        });
      }
    }

    const group = await Group.create({
      name,
      createdBy,
      members: members || [createdBy],
    });
    console.log(group, "group");

    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      data: group,
      inviteLink: `${process.env.APP_URL}/invite/${group.inviteCode}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({
      $or: [{ members: userId }, { createdBy: userId }],
    })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getGroup = async (req, res) => {
  try {
    console.log(req.params.id);

    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("createdBy", "name email");
    console.log(group, "kbkbj");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    const isMember = group.members.some(
      (member) =>
        member._id.toString() === req.user._id.toString() ||
        group.createdBy._id.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }
    console.log(group, "gr");

    res.status(200).json({
      success: true,
      data: group,
      inviteLink: `${process.env.APP_URL}/invite/${group.inviteCode}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Join group via invite code
exports.joinGroupByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({ inviteCode })
      .populate("members", "name email")
      .populate("createdBy", "name email");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    // Check if invite code is still valid
    if (!group.isInviteCodeValid()) {
      return res.status(400).json({
        success: false,
        message: "Invite code has expired",
      });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      (member) => member._id.toString() === userId.toString(),
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this group",
      });
    }

    // Add user to group
    group.members.push(userId);
    await group.save();
    await group.populate("members", "name email");

    res.status(200).json({
      success: true,
      message: "Successfully joined the group",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Regenerate invite code
exports.regenerateInviteCode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only group creator can regenerate invite code
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can regenerate invite code",
      });
    }

    await group.regenerateInviteCode();
    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Invite code regenerated successfully",
      data: group,
      inviteLink: `${process.env.APP_URL}/invite/${group.inviteCode}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get group by invite code (to preview before joining)
exports.getGroupByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const group = await Group.findOne({ inviteCode })
      .populate("createdBy", "name email")
      .select("name createdBy inviteCodeExpiry members");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    if (!group.isInviteCodeValid()) {
      return res.status(400).json({
        success: false,
        message: "Invite code has expired",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: group.name,
        createdBy: group.createdBy,
        memberCount: group.members.length,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Add user to group
exports.addUserToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    console.log(req.body, "body");

    // Validate input
    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "groupId and userId are required",
      });
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already a member
    const isMember = group.members.some(
      (member) => member.toString() === userId,
    );
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this group",
      });
    }

    // Add user to group
    group.members.push(userId);
    await group.save();
    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "User added to group successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Remove member from group
exports.removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const currentUserId = req.user._id;

    // Validate input
    if (!groupId || !memberId) {
      return res.status(400).json({
        success: false,
        message: "groupId and memberId are required",
      });
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only group creator can remove members
    if (group.createdBy.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can remove members",
      });
    }

    // Check if member exists in group
    const isMember = group.members.some(
      (member) => member.toString() === memberId,
    );
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this group",
      });
    }

    // Cannot remove the group creator
    if (group.createdBy.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove group creator",
      });
    }

    // Remove member from group
    group.members = group.members.filter(
      (member) => member.toString() !== memberId,
    );
    await group.save();
    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Member removed from group successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update group
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only group creator can update group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can update group",
      });
    }

    group.name = name || group.name;
    await group.save();
    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Only group creator can delete group
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group creator can delete group",
      });
    }

    // Delete all expenses associated with this group
    await Expense.deleteMany({ group: id });

    // Delete the group
    await Group.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Group and its expenses deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
