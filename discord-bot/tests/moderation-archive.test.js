import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const { getForumThreads } = await import('../src/utils/moderation-archive.js');

test('active-thread lookup is guild-scoped and filters to the configured forum', async () => {
  const requests = [];
  const client = {
    rest: {
      async get(route) {
        requests.push(route);
        if (route === '/guilds/guild-id/threads/active') {
          return {
            threads: [
              { id: 'case-thread', parent_id: 'forum-id' },
              { id: 'other-thread', parent_id: 'another-forum' },
            ],
          };
        }
        if (route === '/channels/forum-id/threads/archived/public') {
          return { threads: [], has_more: false };
        }
        throw new Error(`Unexpected Discord REST route: ${route}`);
      },
    },
  };

  const threads = await getForumThreads(client, 'forum-id', 'guild-id');

  assert.deepEqual(threads, [{ id: 'case-thread', parent_id: 'forum-id' }]);
  assert.deepEqual(requests, [
    '/guilds/guild-id/threads/active',
    '/channels/forum-id/threads/archived/public',
  ]);
});
