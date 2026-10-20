export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.info(`Ready as ${client.user.tag}`);
  }
};
