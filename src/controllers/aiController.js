const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Payment = require("../models/Payment");

exports.aiChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user._id;
    const userName = req.user.name || "User";

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please provide a message",
      });
    }

    // 1. Fetch user's active groups
    const userGroups = await Group.find({ members: userId }).populate("members", "name email");
    const groupIds = userGroups.map((g) => g._id);

    // 2. Fetch recent expenses for those groups
    const recentExpenses = await Expense.find({
      groupId: { $in: groupIds },
    })
      .populate("paidBy", "name email")
      .populate("splitBetween", "name email")
      .populate("groupId", "name")
      .sort("-createdAt")
      .limit(30);

    // 3. Fetch recent payments/settlements for those groups
    const recentPayments = await Payment.find({
      groupId: { $in: groupIds },
    })
      .populate("paidBy", "name email")
      .populate("paidTo", "name email")
      .populate("groupId", "name")
      .sort("-createdAt")
      .limit(20);

    // 4. Build summaries to keep context payload small and high quality
    const userGroupsSummary = userGroups.map((g) => ({
      groupId: g._id,
      name: g.name,
      members: g.members.map((m) => ({ id: m._id, name: m.name })),
    }));

    const recentExpensesSummary = recentExpenses.map((e) => ({
      description: e.description,
      amount: e.amount,
      paidBy: e.paidBy?.name,
      splitBetween: e.splitBetween.map((m) => m.name),
      groupName: e.groupId?.name,
      date: e.createdAt,
    }));

    const recentPaymentsSummary = recentPayments.map((p) => ({
      amount: p.amount,
      paidBy: p.paidBy?.name,
      paidTo: p.paidTo?.name,
      groupName: p.groupId?.name,
      date: p.createdAt,
    }));

    const apiKey = process.env.GEMINI_API_KEY;

    // Graceful fallback if API key is not configured
    if (!apiKey || apiKey === "AIzaSyBqyWxestACqHrUjRoPI-GKsNMogY6xb4s") {
      const demoResponse = `👋 Hi **${userName}**! I am your **Expensu AI Assistant**!

To activate my full brain power and let me analyze your real-time group balances, please add your **Gemini API Key** to the backend \`.env\` file like this:
\`\`\`env
GEMINI_API_KEY=your_actual_api_key
\`\`\`

*(You can get a free Gemini API Key in 10 seconds from [Google AI Studio](https://aistudio.google.com/))!*

---

💡 **Here is a sneak peek of what I will be able to do once connected:**
1. **Analyze your spending:** Tell you exactly where your money goes (*e.g., "Saurabh, you spent ₹4,500 on pizza this month!"*).
2. **Calculate net balances:** Tell you who owes you or who you need to settle up with.
3. **Draft funny reminders:** Write hilarious messages to send to your friends who are delaying payments! E.g.:
   > *"Oi Rahul! Our friendship is priceless, but your share of ₹350 for the cab isn't. Scan & settle! 😉"*

Let me know if you need help setting up the API key! 🚀`;

      return res.status(200).json({
        success: true,
        data: demoResponse,
        demoMode: true,
      });
    }

    // 5. Structure system instruction and payload for Gemini 2.5 Flash
    const systemInstructionText = `
You are "Expensu AI Assistant", an intelligent personal finance and expense-splitting companion built into the Expensu/SplitMate app.
You have real-time access to the user's financial context:
- Current User: ${userName} (ID: ${userId})
- Groups Joined: ${JSON.stringify(userGroupsSummary)}
- Recent Expenses in User's Groups: ${JSON.stringify(recentExpensesSummary)}
- Recent Payments/Settlements: ${JSON.stringify(recentPaymentsSummary)}

Use this data to answer questions about group expenses, who spent how much, who paid for what, who owes who, and overall spend patterns.
You can also generate personalized, friendly, or funny payment reminders that the user can copy.
Always speak in a friendly, helpful, and highly engaging tone. Support both English and Hindi/Hinglish (mix of Hindi & English) seamlessly, responding in the same language and style that the user uses.
If the user asks who owes them or what their balances are, calculate it dynamically based on the groups, expenses, and payments summaries.
Keep your responses relatively concise so they look great on a mobile screen. Use markdown elements (like emojis, bold text, lists) to format your response beautifully.
`;

    // 6. Format history for Gemini
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      });
    }
    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const geminiPayload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstructionText }],
      },
    };

    // 7. Make API request to Gemini 2.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API Error:", errBody);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that. Please try again.";

    res.status(200).json({
      success: true,
      data: aiText,
      demoMode: false,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to connect to AI Assistant: " + error.message,
    });
  }
};
