import { ChannelType } from 'discord.js';
import { supabase } from '../database/supabase.js';

const CASE_TABLE = 'moderation_cases';
const EVIDENCE_BUCKET = 'moderation-evidence';
const MAX_CASE_THREADS = 2000;
const MAX_MESSAGES_PER_THREAD = 500;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_CONTENT_LENGTH = 100000;
const ARCHIVE_INTERVAL_MS = 6 * 60 * 60 * 1000;

let activeSync;

const fetchDiscord = async (client, route, query) => {
  const options = query ? { query: new URLSearchParams(query) } : undefined;
  return client.rest.get(route, options);
};

const getForumThreads = async (client, channelId) => {
  const threadsById = new Map();
  const active = await fetchDiscord(client, `/channels/${channelId}/threads/active`);
  for (const thread of active.threads || []) threadsById.set(thread.id, thread);

  let before;
  let hasMore = false;
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const query = { limit: '100' };
    if (before) query.before = before;
    const page = await fetchDiscord(client, `/channels/${channelId}/threads/archived/public`, query);
    const threads = page.threads || [];
    for (const thread of threads) threadsById.set(thread.id, thread);
    hasMore = Boolean(page.has_more);
    if (!hasMore || threads.length === 0) break;

    before = threads[threads.length - 1].thread_metadata?.archive_timestamp;
    if (!before) throw new Error('Discord archived-thread page was missing its pagination timestamp.');
    if (threadsById.size > MAX_CASE_THREADS) {
      throw new RangeError(`Moderation forum exceeds the ${MAX_CASE_THREADS}-thread safety limit.`);
    }
  }

  if (hasMore) throw new RangeError('Moderation forum history exceeds the 100-page scan limit.');
  if (threadsById.size > MAX_CASE_THREADS) {
    throw new RangeError(`Moderation forum exceeds the ${MAX_CASE_THREADS}-thread safety limit.`);
  }
  return [...threadsById.values()];
};

const getThreadMessages = async (client, threadId) => {
  const messages = [];
  let before;

  while (messages.length <= MAX_MESSAGES_PER_THREAD) {
    const query = { limit: '100' };
    if (before) query.before = before;
    const page = await fetchDiscord(client, `/channels/${threadId}/messages`, query);
    if (!Array.isArray(page) || page.length === 0) break;
    if (messages.length + page.length > MAX_MESSAGES_PER_THREAD) {
      throw new RangeError(`Case thread ${threadId} exceeds the ${MAX_MESSAGES_PER_THREAD}-message safety limit.`);
    }
    messages.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].id;
  }

  return messages.reverse();
};

const safeFilename = (name) => {
  const cleaned = name.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(0, 100);
  return cleaned || 'evidence';
};

const readLimitedBody = async (response) => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Attachment response did not contain a readable body.');

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_ATTACHMENT_BYTES) {
      await reader.cancel();
      throw new RangeError('Evidence attachment exceeds the 25 MB archive limit.');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, size);
};

const archiveAttachment = async (threadId, messageId, attachment) => {
  const sourceUrl = new URL(attachment.url);
  if (!['cdn.discordapp.com', 'media.discordapp.net'].includes(sourceUrl.hostname)) {
    throw new Error('Evidence attachment is not hosted on an approved Discord CDN.');
  }

  const downloadResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
  if (!downloadResponse.ok) throw new Error(`Evidence download failed: ${downloadResponse.status}`);

  const contentLength = Number(downloadResponse.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_ATTACHMENT_BYTES) {
    throw new RangeError('Evidence attachment exceeds the 25 MB archive limit.');
  }

  const data = await readLimitedBody(downloadResponse);
  const contentType = downloadResponse.headers.get('content-type') || attachment.content_type || 'application/octet-stream';
  const storagePath = `${threadId}/${messageId}/${attachment.id}-${safeFilename(attachment.filename || 'evidence')}`;
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, data, { contentType, upsert: true });

  if (error) throw error;
  return {
    filename: attachment.filename || 'evidence',
    contentType,
    size: data.length,
    storagePath,
    status: 'stored',
  };
};

const archiveMessageAttachments = async (threadId, messages) => {
  const evidence = [];
  let failedEvidence = 0;

  for (const message of messages) {
    for (const attachment of message.attachments || []) {
      try {
        evidence.push(await archiveAttachment(threadId, message.id, attachment));
      } catch (error) {
        failedEvidence += 1;
        console.error(`Unable to archive moderation evidence ${attachment.id}:`, error);
        evidence.push({
          filename: attachment.filename || 'evidence',
          contentType: attachment.content_type || null,
          size: attachment.size || null,
          status: 'failed',
        });
      }
    }
  }

  return { evidence, failedEvidence };
};

const messageText = (message) => {
  const embedText = (message.embeds || []).flatMap((embed) => [
    embed.title,
    embed.description,
    ...(embed.fields || []).flatMap((field) => [field.name, field.value]),
  ]).filter(Boolean).join('\n');
  return [message.content, embedText].filter(Boolean).join('\n');
};

export const parseCaseFile = (thread, messages, evidence) => {
  const text = messages.map(messageText).filter(Boolean).join('\n');
  const caseNumber = `${thread.name || ''}\n${text}`.match(/\bCASE\s*#\s*(\d+)\b/i)?.[1] || null;
  const targetUserId = text.match(/\bUser\s*ID\s*:\s*\[?(\d{15,20})\]?/i)?.[1] || null;
  const targetUsername = text.match(/\bUsername\s*:\s*@?([^\]\r\n|]+)/i)?.[1]?.trim() || null;
  const platforms = [];
  if (/\[\s*x\s*\]\s*Discord/i.test(text)) platforms.push('discord');
  if (/\[\s*x\s*\]\s*Twitch/i.test(text)) platforms.push('twitch');
  if (!platforms.length) platforms.push('discord');

  const actionText = text.split(/ACTION\s+DETAILS|ACTION\s+TAKEN/i).slice(1).join('\n');
  const actions = [];
  const actionPatterns = [
    [/\[\s*x\s*\]\s*(?:permanent\s+)?ban\b/i, 'ban'],
    [/\[\s*x\s*\]\s*(?:temporary\s+ban|temp\s+ban)\b/i, 'temporary_ban'],
    [/\[\s*x\s*\]\s*(?:timeout|mute)\b/i, 'timeout'],
    [/\[\s*x\s*\]\s*(?:warning|warn)\b/i, 'warning'],
    [/\[\s*x\s*\]\s*kick\b/i, 'kick'],
  ];
  for (const [pattern, action] of actionPatterns) {
    if (pattern.test(actionText)) actions.push(action);
  }

  const reason = text.match(/\bReason\s*:\s*([^\r\n]+)/i)?.[1]?.trim() || null;
  const appealStatus = text.match(/\bAppeal(?:\s+Status)?\s*:\s*([^\r\n]+)/i)?.[1]?.trim()
    || (/\bAppealed\b/i.test(text) ? 'Appealed' : null);
  const starter = messages[0];
  const rawContent = messages.map((message) => ({
    id: message.id,
    createdAt: message.timestamp,
    authorId: message.author?.id || null,
    authorUsername: message.author?.username || null,
    content: message.content || '',
    embeds: message.embeds || [],
  }));
  const rawText = JSON.stringify(rawContent);
  if (rawText.length > MAX_CONTENT_LENGTH) {
    throw new RangeError(`Case thread ${thread.id} exceeds the content archive limit.`);
  }

  return {
    source_system: 'discord_forum',
    source_id: thread.id,
    case_number: caseNumber,
    platforms,
    actions,
    target_user_id: targetUserId,
    target_username: targetUsername,
    moderator_user_id: starter?.author?.id || null,
    moderator_username: starter?.author?.username || null,
    reason,
    appeal_status: appealStatus,
    status: 'recorded',
    source_url: `https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/${thread.id}`,
    raw_content: rawContent,
    evidence,
    occurred_at: starter?.timestamp || thread.thread_metadata?.create_timestamp || null,
  };
};

const upsertRows = async (rows) => {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await supabase
      .from(CASE_TABLE)
      .upsert(rows.slice(offset, offset + 100), { onConflict: 'source_system,source_id' });
    if (error) throw error;
  }
};

const mergeForumRows = async (rows) => {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const { data: existing, error } = await supabase
      .from(CASE_TABLE)
      .select('source_id,raw_content,evidence')
      .eq('source_system', 'discord_forum')
      .in('source_id', batch.map((row) => row.source_id));
    if (error) throw error;

    const existingById = new Map((existing || []).map((row) => [row.source_id, row]));
    for (const row of batch) {
      const previous = existingById.get(row.source_id);
      if (!previous) continue;

      const messagesById = new Map((Array.isArray(previous.raw_content) ? previous.raw_content : [])
        .map((message) => [message.id, message]));
      for (const message of row.raw_content) messagesById.set(message.id, message);
      row.raw_content = [...messagesById.values()];

      const evidenceByPath = new Map((Array.isArray(previous.evidence) ? previous.evidence : [])
        .map((item) => [item.storagePath || item.filename, item]));
      for (const item of row.evidence) {
        const key = item.storagePath || item.filename;
        const oldItem = evidenceByPath.get(key);
        evidenceByPath.set(key, item.status === 'failed' && oldItem?.status === 'stored' ? oldItem : item);
      }
      row.evidence = [...evidenceByPath.values()];
    }
  }
};

export const syncForumCaseThread = async (client, threadId) => {
  const thread = await client.channels.fetch(threadId);
  if (!thread?.isThread() || thread.parentId !== process.env.MODERATION_CASE_CHANNEL_ID) return null;

  const messages = await getThreadMessages(client, threadId);
  const archived = await archiveMessageAttachments(threadId, messages);
  const row = parseCaseFile(thread, messages, archived.evidence);
  await mergeForumRows([row]);
  await upsertRows([row]);
  return { archivedCases: 1, failedEvidence: archived.failedEvidence };
};

const syncForumCases = async (client) => {
  const channelId = process.env.MODERATION_CASE_CHANNEL_ID;
  if (!channelId) throw new Error('MODERATION_CASE_CHANNEL_ID is not configured.');

  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildForum) {
    throw new TypeError('MODERATION_CASE_CHANNEL_ID must be a Discord forum channel.');
  }

  const threads = await getForumThreads(client, channelId);
  let failedEvidence = 0;
  const rows = [];

  for (const thread of threads) {
    const messages = await getThreadMessages(client, thread.id);
    const archived = await archiveMessageAttachments(thread.id, messages);
    failedEvidence += archived.failedEvidence;
    rows.push(parseCaseFile(thread, messages, archived.evidence));
  }

  await mergeForumRows(rows);
  await upsertRows(rows);
  return { scannedThreads: threads.length, archivedCases: rows.length, failedEvidence };
};

const getAllDiscordBans = async (client, guildId) => {
  const bans = [];
  let after;

  while (true) {
    const query = { limit: '1000' };
    if (after) query.after = after;
    const page = await fetchDiscord(client, `/guilds/${guildId}/bans`, query);
    if (!Array.isArray(page)) throw new TypeError('Discord ban-list response was invalid.');
    bans.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1]?.user?.id;
    if (!after) throw new Error('Discord ban-list pagination stopped unexpectedly.');
  }

  return bans;
};

const syncDiscordBans = async (client) => {
  const guildId = process.env.DISCORD_GUILD_ID;
  const bans = await getAllDiscordBans(client, guildId);
  const rows = bans.map(({ user, reason }) => ({
    source_system: 'discord_ban',
    source_id: user.id,
    platforms: ['discord'],
    actions: ['ban'],
    target_user_id: user.id,
    target_username: user.global_name || user.username,
    reason: reason || null,
    status: 'active',
    source_url: `https://discord.com/channels/${guildId}`,
    raw_content: [{ user }],
    evidence: [],
    occurred_at: null,
  }));

  await upsertRows(rows);

  const existing = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(CASE_TABLE)
      .select('source_id')
      .eq('source_system', 'discord_ban')
      .eq('status', 'active')
      .range(offset, offset + 999);
    if (error) throw error;
    existing.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const currentIds = new Set(bans.map(({ user }) => user.id));
  const removedIds = (existing || [])
    .map(({ source_id: sourceId }) => sourceId)
    .filter((sourceId) => !currentIds.has(sourceId));

  for (let offset = 0; offset < removedIds.length; offset += 100) {
    const { error: updateError } = await supabase
      .from(CASE_TABLE)
      .update({ status: 'inactive', synced_at: new Date().toISOString() })
      .eq('source_system', 'discord_ban')
      .in('source_id', removedIds.slice(offset, offset + 100));
    if (updateError) throw updateError;
  }

  return { activeBans: bans.length, removedBans: removedIds.length };
};

export const archiveDiscordBan = async (ban) => {
  const guildId = ban.guild.id;
  const { error } = await supabase.from(CASE_TABLE).upsert({
    source_system: 'discord_ban',
    source_id: ban.user.id,
    platforms: ['discord'],
    actions: ['ban'],
    target_user_id: ban.user.id,
    target_username: ban.user.globalName || ban.user.username,
    reason: ban.reason || null,
    status: 'active',
    source_url: `https://discord.com/channels/${guildId}`,
    raw_content: [{ user: { id: ban.user.id, username: ban.user.username } }],
    evidence: [],
    occurred_at: null,
  }, { onConflict: 'source_system,source_id' });
  if (error) throw error;
};

export const recordModerationAction = async (interaction, {
  action,
  user,
  reason = null,
}) => {
  const { error } = await supabase.from(CASE_TABLE).upsert({
    source_system: 'discord_action',
    source_id: interaction.id,
    platforms: ['discord'],
    actions: [action],
    target_user_id: user.id,
    target_username: user.globalName || user.username,
    moderator_user_id: interaction.user.id,
    moderator_username: interaction.user.globalName || interaction.user.username,
    reason,
    status: 'recorded',
    source_url: `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`,
    raw_content: [{ interactionId: interaction.id }],
    evidence: [],
    occurred_at: new Date(interaction.createdTimestamp).toISOString(),
  }, { onConflict: 'source_system,source_id' });
  if (error) throw error;
};

export const tryRecordModerationAction = async (interaction, actionData) => {
  try {
    await recordModerationAction(interaction, actionData);
    return true;
  } catch (error) {
    console.error(`Moderation action ${interaction.id} was applied, but its archive write failed:`, error);
    return false;
  }
};

export const markDiscordBanInactive = async (ban) => {
  const { error } = await supabase
    .from(CASE_TABLE)
    .update({ status: 'inactive', synced_at: new Date().toISOString() })
    .eq('source_system', 'discord_ban')
    .eq('source_id', ban.user.id);
  if (error) throw error;
};

export const syncModerationArchive = (client) => {
  if (activeSync) return activeSync;

  activeSync = (async () => {
    const forum = await syncForumCases(client);
    const discord = await syncDiscordBans(client);
    return { forum, discord, syncedAt: new Date().toISOString() };
  })().finally(() => {
    activeSync = null;
  });

  return activeSync;
};

export const startModerationArchiveSync = (client) => {
  if (!process.env.MODERATION_CASE_CHANNEL_ID) {
    console.warn('MODERATION_CASE_CHANNEL_ID is unset; moderation archive sync is disabled.');
    return;
  }

  const runSync = () => syncModerationArchive(client)
    .then((result) => console.info('Moderation archive synchronized:', result))
    .catch((error) => console.error('Moderation archive sync failed:', error));

  runSync();
  const interval = setInterval(runSync, ARCHIVE_INTERVAL_MS);
  interval.unref();
};
