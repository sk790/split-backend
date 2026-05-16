const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env vars
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("./models/User");

const generateUniqueUsername = async (name) => {
  let baseUsername = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");

  if (!baseUsername) {
    baseUsername = "user";
  }

  let username = baseUsername;
  let counter = 1;
  let exists = await User.findOne({ username });

  while (exists) {
    username = `${baseUsername}${counter}`;
    exists = await User.findOne({ username });
    counter++;
  }

  return username;
};

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    const users = await User.find({ username: { $exists: false } });
    console.log(`Found ${users.length} users without usernames.`);

    for (const user of users) {
      const username = await generateUniqueUsername(user.name);
      user.username = username;
      await user.save();
      console.log(`Updated user ${user.email} with username ${username}`);
    }

    const usersWithNull = await User.find({ username: null });
    console.log(`Found ${usersWithNull.length} users with null usernames.`);
    for (const user of usersWithNull) {
      const username = await generateUniqueUsername(user.name);
      user.username = username;
      await user.save();
      console.log(`Updated user ${user.email} with username ${username}`);
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateUsers();
