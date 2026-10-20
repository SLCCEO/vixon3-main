const approverNames = ['VexonCore', 'Testing10325'];

export async function notifyLoaApprovers(client, { requesterId, requesterTag, reason }) {
  let staffIds;
  try {
    staffIds = JSON.parse(process.env.DISCORD_STAFF_IDS || '{}');
  } catch (error) {
    throw new Error('DISCORD_STAFF_IDS must contain valid JSON to notify LOA approvers.', { cause: error });
  }

  if (!staffIds || Array.isArray(staffIds) || typeof staffIds !== 'object') {
    throw new TypeError('DISCORD_STAFF_IDS must be a JSON object to notify LOA approvers.');
  }

  const recipients = approverNames
    .map((name) => ({ name, userId: staffIds[name] }))
    .filter(({ userId }) => typeof userId === 'string' && /^\d{17,20}$/.test(userId));
  const missingNames = approverNames.filter((name) =>
    !recipients.some((recipient) => recipient.name === name));
  const uniqueRecipients = recipients.filter((recipient, index, list) =>
    list.findIndex((candidate) => candidate.userId === recipient.userId) === index);

  const results = await Promise.all(uniqueRecipients.map(async ({ name, userId }) => {
    try {
      const user = await client.users.fetch(userId);
      await user.send({
        content: [
          '**New staff LOA request**',
          `Staff member: ${requesterTag} (<@${requesterId}>)`,
          `Reason: ${reason}`,
          '',
          'Review this request in the VEXON server. Run `/loa-approve` or `/loa-reject`, then select this staff member in the user option.'
        ].join('\n'),
        allowedMentions: { parse: [] }
      });
      return { name, success: true };
    } catch (error) {
      console.error(`Unable to DM LOA approver ${name} (${userId}):`, error);
      return { name, success: false };
    }
  }));

  return {
    notifiedNames: results.filter((result) => result.success).map((result) => result.name),
    failedNames: [
      ...missingNames,
      ...results.filter((result) => !result.success).map((result) => result.name)
    ]
  };
}
