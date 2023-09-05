export const botConfig = {
  token: process.env.BOT_TOKEN ?? '',
  ondrei_url: 'http://92.63.104.239:5000',
  messages: {
    slotmachine: {
      command: /\/slotmachine(@realnewman_bot)?/,
    },
    tictactoe: {
      command: /\/tictactoe(@realnewman_bot)?/,
    },
    play: {
      command: /\/play(@realnewman_bot)?/,
    },
    delete: {
      command: /\/delete(@realnewman_bot)?/,
    },
    blackjack: {
      command: /\/blackjack(@realnewman_bot)?/,
    },
    spin: {
      command: /\/spin(@realnewman_bot)?/,
    },
    // info: {
    //   command: /\/info(@realnewman_bot)?/,
    // },
  },
};
