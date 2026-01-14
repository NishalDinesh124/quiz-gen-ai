import UserActivityDaily from "../models/userActivityDailyModel.js";

const getUtcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const trackLoginOnce = async (userId) => {
  if (!userId) return;
  const dateKey = getUtcDateKey();
  await UserActivityDaily.updateOne(
    { userId, date: dateKey },
    {
      $setOnInsert: {
        userId,
        date: dateKey,
        loginCount: 1,
      },
    },
    { upsert: true }
  );
};

const incrementUserActivity = async (userId, updates) => {
  if (!userId || !updates || typeof updates !== "object") return;
  const dateKey = getUtcDateKey();
  await UserActivityDaily.updateOne(
    { userId, date: dateKey },
    {
      $setOnInsert: { userId, date: dateKey },
      $inc: updates,
    },
    { upsert: true }
  );
};

export { getUtcDateKey, incrementUserActivity, trackLoginOnce };
