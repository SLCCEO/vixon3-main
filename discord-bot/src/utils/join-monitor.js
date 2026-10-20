const joinWindows = new Map();

function readPositiveNumber(value, fallback, name, { integer = false, minimum = 1 } = {}) {
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${name} must be ${integer ? 'an integer' : 'a number'} greater than or equal to ${minimum}.`);
  }
  return parsed;
}

export function getJoinMonitoringConfig(environment = process.env) {
  const alertChannelId = environment.MODERATION_ALERT_CHANNEL_ID || null;
  if (alertChannelId && !/^\d{17,20}$/.test(alertChannelId)) {
    throw new Error('MODERATION_ALERT_CHANNEL_ID must be a valid Discord channel ID.');
  }

  return {
    alertChannelId,
    minimumAccountAgeMs: readPositiveNumber(
      environment.MIN_ACCOUNT_AGE_DAYS,
      7,
      'MIN_ACCOUNT_AGE_DAYS',
      { minimum: 0 }
    ) * 24 * 60 * 60 * 1000,
    joinSpikeThreshold: readPositiveNumber(
      environment.JOIN_SPIKE_THRESHOLD,
      5,
      'JOIN_SPIKE_THRESHOLD',
      { integer: true, minimum: 2 }
    ),
    joinSpikeWindowMs: readPositiveNumber(
      environment.JOIN_SPIKE_WINDOW_SECONDS,
      60,
      'JOIN_SPIKE_WINDOW_SECONDS'
    ) * 1000
  };
}

export function isNewAccount(createdTimestamp, now, minimumAccountAgeMs) {
  return Number.isFinite(createdTimestamp)
    && now - createdTimestamp < minimumAccountAgeMs;
}

export function recordGuildJoin(guildId, now, threshold, windowMs, windows = joinWindows) {
  const cutoff = now - windowMs;
  const current = windows.get(guildId) ?? { timestamps: [], alerted: false };
  current.timestamps = current.timestamps.filter((timestamp) => timestamp > cutoff);
  current.timestamps.push(now);

  if (current.timestamps.length < threshold) {
    current.alerted = false;
  }

  const shouldAlert = current.timestamps.length >= threshold && !current.alerted;
  if (shouldAlert) current.alerted = true;
  windows.set(guildId, current);

  return { count: current.timestamps.length, shouldAlert };
}
