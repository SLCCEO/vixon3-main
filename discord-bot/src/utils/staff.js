import { PermissionFlagsBits } from 'discord.js';

const loaApproverNames = ['VexonCore', 'Testing10325'];

function hasConfiguredStaffRole(interaction) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const roles = interaction.member?.roles;
  return Boolean(staffRoleId && (
    roles?.cache?.has(staffRoleId) || roles?.includes?.(staffRoleId)
  ));
}

function hasManageGuildPermission(interaction) {
  const isServerManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  return Boolean(isServerManager);
}

function getLoaApproverIds() {
  let configuredStaff;
  try {
    configuredStaff = JSON.parse(process.env.DISCORD_STAFF_IDS || '{}');
  } catch (error) {
    throw new Error('DISCORD_STAFF_IDS must contain valid JSON to check LOA approver access.', { cause: error });
  }

  if (!configuredStaff || Array.isArray(configuredStaff) || typeof configuredStaff !== 'object') {
    throw new TypeError('DISCORD_STAFF_IDS must be a JSON object to check LOA approver access.');
  }

  return loaApproverNames
    .map((name) => configuredStaff[name])
    .filter((userId) => typeof userId === 'string' && /^\d{17,20}$/.test(userId));
}

export function hasStaffAccess(interaction) {
  return hasConfiguredStaffRole(interaction) || hasManageGuildPermission(interaction);
}

export function requireStaff(interaction) {
  if (!hasStaffAccess(interaction)) {
    throw new Error('You need the configured staff role or Manage Server permission to use this command.');
  }
}

export function requireLoaApproverOrStaff(interaction) {
  const isConfiguredApprover = getLoaApproverIds().includes(interaction.user.id);
  if (!isConfiguredApprover && !hasStaffAccess(interaction)) {
    throw new Error('You need to be a configured LOA approver, have the configured staff role, or have Manage Server permission.');
  }
}

export function requirePermission(interaction, permission, label) {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new Error(`You need the ${label} permission to use this command.`);
  }
}
