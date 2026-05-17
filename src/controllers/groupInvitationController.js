const GroupInvitation = require("../models/GroupInvitation");
const Group = require("../models/Group");
const User = require("../models/User");
const { sendPushNotification } = require("../utils/notificationService");

// Send an invitation
exports.sendInvitation = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const inviterId = req.user._id;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Check if user exists
    const invitee = await User.findById(userId);
    if (!invitee) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: "User is already a member" });
    }

    // Check for existing pending invitation
    const existingInvitation = await GroupInvitation.findOne({
      group: groupId,
      invitee: userId,
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(400).json({ success: false, message: "Invitation already sent" });
    }

    const invitation = await GroupInvitation.create({
      group: groupId,
      inviter: inviterId,
      invitee: userId,
    });

    console.log(invitee,'invitee');
    
    // Send push notification to invitee
    if (invitee.expoPushToken) {
      await sendPushNotification(
        invitee.expoPushToken,
        "New Group Invitation 👥",
        `${req.user.name} invited you to join "${group.name}"`,
        { type: "GROUP_INVITATION", groupId: group._id }
      );
    }

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: invitation,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get pending invitations for current user
exports.getMyInvitations = async (req, res) => {
  try {
    const invitations = await GroupInvitation.find({
      invitee: req.user._id,
      status: "pending",
    })
      .populate("group", "name members")
      .populate("inviter", "name email");

    // Filter out invitations for deleted/soft-deleted groups or users
    const activeInvitations = invitations.filter(
      (inv) => inv.group !== null && inv.inviter !== null
    );

    res.status(200).json({
      success: true,
      data: activeInvitations,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Respond to invitation
exports.respondToInvitation = async (req, res) => {
  try {
    const { invitationId, status } = req.body; // status: 'accepted' or 'rejected'

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: "Invitation already processed" });
    }

    invitation.status = status;
    await invitation.save();

    if (status === "accepted") {
      const group = await Group.findById(invitation.group);
      if (group) {
        if (!group.members.includes(req.user._id)) {
          group.members.push(req.user._id);
          await group.save();

          // Notify the inviter
          const inviter = await User.findById(invitation.inviter);
          if (inviter && inviter.expoPushToken) {
            await sendPushNotification(
              inviter.expoPushToken,
              "Member Joined! 🎉",
              `${req.user.name} joined "${group.name}"`,
              { type: "MEMBER_JOINED", groupId: group._id }
            );
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Invitation ${status} successfully`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
