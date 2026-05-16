const User = require("../models/User");

exports.getWalletStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Count how many people this user has referred
    const referralCount = await User.countDocuments({ referredBy: user._id });

    res.status(200).json({
      success: true,
      data: {
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        referralCount: referralCount,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
