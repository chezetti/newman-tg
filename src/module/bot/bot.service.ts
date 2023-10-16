import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Context } from 'vm';
import { promisify } from 'util';

import { botConfig } from 'src/config/bot.config';
import { TicTacToeService } from '../tic-tac-toe/tic-tac-toe.service';
import { readUserFromFile, writeUserToFile } from 'src/utils/file.util';
import { CasinoService } from '../casino/casino.service';
import { BlackjackActionEnum } from '../casino/enums/blackjack.enum';
import { getCurrentUTCDate } from 'src/utils/date.util';
import { TGameType } from '../casino/types/game-type.type';

const sleep = promisify(setTimeout);

@Injectable()
export class BotService implements OnModuleInit {
  private readonly messagesConfig = botConfig.messages;
  // private mathProblemActive = false;
  private currentProblem = '';
  private correctAnswer = 0;

  constructor(
    @InjectBot() private readonly bot: Telegraf<any>,
    private readonly ticTacToeService: TicTacToeService,
    private readonly casinoService: CasinoService,
  ) {}

  async onModuleInit() {
    this.bot.start((ctx) =>
      ctx.reply('Напишите / чтобы увидеть список команд.'),
    );

    for (const [messageKey] of Object.entries(this.messagesConfig)) {
      this.bot.command(messageKey, async (ctx) => {
        try {
          const chatId = ctx.chat?.id;
          const { id, username } = ctx.from;

          writeUserToFile(chatId, id, username);
          const response = await this.methodsList[messageKey](ctx);

          if (response) {
            await ctx.reply(response);
          }
        } catch (e) {
          console.error(`Error in ${messageKey}:`, e);
        }
      });
    }
  }

  get methodsList(): {
    [key: string]: (ctx: Context) => Promise<string>;
  } {
    return {
      slotmachine: this.generateSlotMachineResult.bind(this),
      tictactoe: this.tictactoe.bind(this),
      play: this.play.bind(this),
      delete: this.delete.bind(this),
      blackjack: this.generateBlackjackResult.bind(this),
      spin: this.spinWheel.bind(this),
      // info: this.getPisunInfo.bind(this),
    };
  }

  // async getPisunInfo(ctx: Context) {
  //   const chatId = ctx.chat.id;

  //   await this.sendPostRequest(`${botConfig.ondrei_url}/get_Pisun_Data`, {
  //     chatId,
  //   });
  // }

  async spinWheel(ctx: Context): Promise<void | string> {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const username = ctx.from.username;

    const disabled = this.checkTime(chatId, userId, 'spin', 15);

    if (disabled) {
      return disabled;
    }

    const frames = await this.casinoService.spinWheel(chatId, userId, username);

    // Отправляем первоначальное сообщение и получаем его ID
    const initialMessage = await ctx.reply('Колесо Фортуны крутится...');
    const messageId = initialMessage.message_id;
    let lastFrame: string | null = null; // Хранение последнего отправленного кадра

    // Проходим через все кадры анимации
    for (const frame of frames) {
      if (frame !== lastFrame) {
        // Проверка, изменился ли кадр
        // Редактируем сообщение. Не нужно указывать chat_id, так как он уже есть в ctx
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          messageId,
          undefined,
          frame,
        );
        lastFrame = frame; // Обновляем последний отправленный кадр
      }
      await sleep(1000); // Задержка в 1 секунду
    }
  }

  async generateBlackjackResult(ctx: Context): Promise<string> {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const disabled = this.checkTime(chatId, userId, 'blackjack', 15);

    if (disabled) {
      return disabled;
    }

    const input = ctx.message.text.split(' ');
    let action = input[1]?.toUpperCase(); // Переводим действие в верхний регистр

    // Проверяем, является ли действие допустимым
    if (!Object.values(BlackjackActionEnum).includes(action)) {
      return 'Неверное действие. Допустимые действия: hit, stand, double';
    }

    const username = ctx.from.username;

    return await this.casinoService.generateBlackjackResult(
      chatId,
      userId,
      username,
      action as BlackjackActionEnum,
    );
  }

  async generateSlotMachineResult(ctx: Context): Promise<string> {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    const disabled = this.checkTime(chatId, userId, 'slotmachine');

    if (disabled) {
      return disabled;
    }

    const username = ctx.from.username;

    return await this.casinoService.generateSlotMachineResult(
      chatId,
      userId,
      username,
    );
  }

  async delete(ctx: Context) {
    if (ctx.from?.username === 'chezetti') {
      const chatId = ctx.chat?.id;
      const currentMessageId = ctx.message?.message_id;

      if (chatId && currentMessageId) {
        for (
          let messageId = currentMessageId - 50;
          messageId < currentMessageId;
          messageId++
        ) {
          try {
            await ctx.telegram.deleteMessage(chatId, messageId);
          } catch (error) {
            continue;
          }
        }
        await ctx.telegram.deleteMessage(chatId, currentMessageId);
      }
    } else {
      return 'Ты не мой хозяин, съебись в ужасе';
    }
  }

  // async generateMathProblem() {
  //   const a = Math.floor(Math.random() * 54);
  //   const b = Math.floor(Math.random() * 87);
  //   this.currentProblem = `${a} + ${b}`;
  //   this.correctAnswer = a + b;

  //   await this.bot.telegram.sendMessage(
  //     '-1001857974024',
  //     `Реши пример: ${this.currentProblem}`,
  //   );
  //   this.mathProblemActive = true;
  // }

  // async checkAnswer(ctx: Context) {
  //   const userAnswer = parseInt(ctx.message.text, 10);

  //   if (userAnswer === this.correctAnswer) {
  //     this.mathProblemActive = false;

  //     return 'Поздравляю! Твой ответ правильный!';
  //   } else {
  //     return 'Ответ неверный.';
  //   }
  // }

  async tictactoe(ctx: Context) {
    const chatId = ctx.chat.id;
    const username = `@${ctx.from.username}`;
    const input = ctx.message.text.split(' ');
    let opponent;

    const choice = input[1] ? input[1].toUpperCase() : 'X'; // Default is 'X'

    if (String(input[2]).startsWith('@')) {
      opponent = input[2];
    }

    return this.ticTacToeService.createGame(chatId, username, choice, opponent);
  }

  async play(ctx: Context) {
    const chatId = ctx.chat.id;
    const userId = `@${ctx.from.username}`;
    const input = ctx.message.text.split(' ');

    const x = parseInt(input[1]);
    const y = parseInt(input[2]);

    if (isNaN(x) || isNaN(y)) {
      return 'Пожалуйста, введите допустимые числовые координаты для хода.';
    }

    return this.ticTacToeService.play(chatId, userId, x, y);
  }

  private checkTime(
    chatId: number,
    userId: number,
    gameType: TGameType,
    cooldownMinutes: number = 30,
  ): string | null {
    const MINUTE_IN_MS = 60 * 1000;
    const COOLDOWN_IN_MS = cooldownMinutes * MINUTE_IN_MS;

    const user = readUserFromFile(chatId, userId);
    if (!user || !user[gameType + 'date']) return null;

    const currentDate = new Date(getCurrentUTCDate());
    const gameDate = new Date(user[gameType + 'date']);

    const timeDifferenceMs = currentDate.getTime() - gameDate.getTime();

    if (timeDifferenceMs < COOLDOWN_IN_MS) {
      const remainingTimeMs = COOLDOWN_IN_MS - timeDifferenceMs;
      const targetTimeMs = currentDate.getTime() + remainingTimeMs;

      const targetDate = new Date(
        targetTimeMs - gameDate.getTimezoneOffset() * MINUTE_IN_MS,
      );
      const targetTimeString = targetDate.toLocaleTimeString();

      return `Попытка исчерпана. Приходите в ${targetTimeString}!`;
    }

    return null;
  }
}
