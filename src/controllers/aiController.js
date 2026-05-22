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
    const userGroups = await Group.find({ members: userId })
      .populate("members", "name email")
      .populate("createdBy", "name email");
    const groupIds = userGroups.map((g) => g._id);

    // 2. Fetch recent expenses for those groups (Optimized limit to save tokens)
    const recentExpenses = await Expense.find({
      groupId: { $in: groupIds },
    })
      .populate("paidBy", "name email")
      .populate("splitBetween", "name email")
      .populate("groupId", "name")
      .sort("-createdAt")
      // .limit(15);

    // 3. Fetch recent payments/settlements for those groups (Optimized limit to save tokens)
    const recentPayments = await Payment.find({
      groupId: { $in: groupIds },
    })
      .populate("paidBy", "name email")
      .populate("paidTo", "name email")
      .populate("groupId", "name")
      .sort("-createdAt")
      // .limit(10);

    // 4. Build ultra-compact plain text summaries to reduce tokens significantly
    const groupsText = userGroups.map((g) => 
      `- "${g.name}" (Admin: ${g.createdBy?.name || "Unknown"}, Members: ${g.members.map((m) => m.name).join(", ")})`
    ).join("\n");

    const expensesText = recentExpenses.map((e) => {
      const dateStr = e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : 'N/A';
      const splitNames = e.splitBetween.map((m) => m.name).join(", ");
      return `- [${dateStr}] Group "${e.groupId?.name || 'Unknown'}": ${e.paidBy?.name || 'Someone'} paid ₹${e.amount} for "${e.description}" (Split: ${splitNames})`;
    }).join("\n");

    const paymentsText = recentPayments.map((p) => {
      const dateStr = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'N/A';
      return `- [${dateStr}] Group "${p.groupId?.name || 'Unknown'}": ${p.paidBy?.name || 'Someone'} paid ₹${p.amount} to ${p.paidTo?.name || 'Someone'}`;
    }).join("\n");

    const apiKey = process.env.GEMINI_API_KEY;

    // Graceful fallback if API key is not configured
    if (!apiKey) {
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

    // 5. Structure system instruction with optimized token usage and clear guidelines
    const systemInstructionText = `You are "Expensu AI Assistant", a smart personal finance & expense-sharing companion for the Expensu app.

Current User: ${userName} (ID: ${userId})

Groups Joined:
${groupsText || "None"}

Recent Expenses (last 15):
${expensesText || "None"}

Recent Payments (last 10):
${paymentsText || "None"}

Rules:
1. Answer questions about group expenses, spent/paid details, who owes whom, spend trends, and group members/admins using only the data above. Calculate balances dynamically if asked.
2. Draft funny or friendly payment reminders to copy if requested.
3. SECURITY: NEVER answer questions outside of Expensu, personal finance, or payments (no general knowledge, history, coding, etc.). Refuse politely in Hinglish/English (e.g., "Sorry, main sirf aapke expenses, groups, aur payments se related sawalon ke jawab de sakta hoon! 💸").
4. Tone: Friendly, engaging. Speak in Hinglish (mix of Hindi & English) or English, matching the user's style seamlessly.
5. Keep responses concise for mobile screens. Use beautiful markdown, bold text, lists, and emojis.`;

    // 6. Format history for Gemini (optimize token usage by keeping only the last 10 messages / 5 turns)
    const contents = [];
    if (history && Array.isArray(history)) {
      const optimizedHistory = history.slice(-10);
      optimizedHistory.forEach((h) => {
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
    console.log("Optimized Gemini Payload size (chars):", JSON.stringify(geminiPayload).length);
    

    // 7. Make API request to Gemini 2.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(geminiPayload),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API Error:", errBody);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const aiText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't process that. Please try again.";

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
