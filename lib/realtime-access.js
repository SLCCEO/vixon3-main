const readUserIds = (environmentVariable) => {
  const value = process.env[environmentVariable] || '';
  const userIds = value.split(',').map((userId) => userId.trim()).filter(Boolean);
  if (userIds.some((userId) => !/^\d{15,20}$/.test(userId))) {
    throw new TypeError(`${environmentVariable} must be a comma-separated list of Discord user IDs.`);
  }
  return new Set(userIds);
};

export const getRealtimeUserAccess = (userId) => {
  const plannerUserIds = readUserIds('VEX_NODE_PLANNER_USER_IDS');
  const techOpsUserIds = readUserIds('VEX_NODE_TECH_OPS_USER_IDS');
  return {
    planner: {
      configured: plannerUserIds.size > 0,
      allowed: plannerUserIds.has(userId),
    },
    tech_ops: {
      configured: techOpsUserIds.size > 0,
      allowed: techOpsUserIds.has(userId),
    },
  };
};
