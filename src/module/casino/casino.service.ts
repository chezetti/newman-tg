import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { botConfig } from 'src/config/bot.config';
import { BlackjackActionEnum } from './enums/blackjack.enum';
import { updateUserInFile } from 'src/utils/file.util';
import { TPrize } from './types/prize.type';
import { TCard } from './types/card.type';

@Injectable()
export class CasinoService {
  private symbols = ['🍒', '🍋', '💎', '💩'];
  private blackjack: { [userId: number]: { score: number; aces: number } } = {};
  private prizes: TPrize[] = [
    { name: '+5 см', chance: 10, value: 5 },
    { name: '+10 см', chance: 20, value: 10 },
    { name: '+15 см', chance: 5, value: 15 },
    { name: '-10 см', chance: 10, value: -10 },
    { name: '-5 см', chance: 20, value: -5 },
    { name: '+0 см', chance: 40, value: 0 },
  ];
  private deck: TCard[] = [];

  constructor(private readonly httpService: HttpService) {}

  async generateSlotMachineResult(
    chatId: number,
    userId: number,
    username: string,
  ): Promise<string> {
    const grid = this.generateGrid();
    const formattedGrid = this.formatGrid(grid);
    const { winMessages, lostMessages, length } = this.checkForWin(grid);

    return this.createFinalMessage(
      winMessages,
      lostMessages,
      length,
      formattedGrid,
      chatId,
      userId,
      username,
    );
  }

  async generateBlackjackResult(
    chatId: number,
    userId: number,
    username: string,
    action: BlackjackActionEnum,
  ): Promise<string> {
    if (this.blackjack[userId] === undefined) {
      this.blackjack[userId] = { score: 0, aces: 0 };
    }

    if (!this.deck.length) {
      this.deck = this.createDeck();
    }

    if (
      action === BlackjackActionEnum.HIT ||
      action === BlackjackActionEnum.DOUBLE
    ) {
      const card = this.drawCard(this.deck);
      const cardValue =
        action === BlackjackActionEnum.DOUBLE ? card.value * 2 : card.value;
      this.blackjack[userId].score += cardValue;
      // Counting the number of aces
      if (card.name.startsWith('A')) {
        this.blackjack[userId].aces +=
          action === BlackjackActionEnum.DOUBLE ? 2 : 1;
      }

      if (this.blackjack[userId].score > 21) {
        // If DOUBLE and score > 21 with two aces, count one of them as 1 instead of 11
        if (
          action === BlackjackActionEnum.DOUBLE &&
          this.blackjack[userId].aces >= 2 &&
          card.name.startsWith('A')
        ) {
          this.blackjack[userId].score -= 10;
          this.blackjack[userId].aces -= 1;
        }
        // If HIT or remaining aces and score > 21, count one ace as 1 instead of 11
        else if (this.blackjack[userId].aces > 0 && card.name.startsWith('A')) {
          this.blackjack[userId].score -= 10;
          this.blackjack[userId].aces -= 1;
        }
        // Still above 21 even after adjusting for aces
        if (this.blackjack[userId].score > 21) {
          const score = -2;
          delete this.blackjack[userId];
          this.changeUserSize(chatId, userId, username, score);
          this.updateUser(chatId, userId, 'blackjack');
          return `Вы проиграли! Вы собрали больше 21, ваш размер уменьшен на ${-score}. Вытянутая карта была ${
            card.name
          } (${card.value}).`;
        }
      }

      if (this.blackjack[userId].score === 21) {
        const score = 5;
        delete this.blackjack[userId];
        this.changeUserSize(chatId, userId, username, score);
        this.updateUser(chatId, userId, 'blackjack');
        return `Поздравляем! Очко! Ваш размер увеличен на ${score}. Вытянутая карта была ${card.name} (${card.value}).`;
      }

      return `Вы получили карту: ${card.name} (${card.value}). Ваш текущий счёт ${this.blackjack[userId].score}.`;
    }

    if (action === BlackjackActionEnum.STAND) {
      const dealerScore = this.getRandomNumber(17, 21);
      if (dealerScore >= this.blackjack[userId].score) {
        const score = -2;
        delete this.blackjack[userId];
        this.changeUserSize(chatId, userId, username, score);
        this.updateUser(chatId, userId, 'blackjack');
        return `Дилер выиграл. Его счёт: ${dealerScore}, ваш размер уменьшен на ${-score}.`;
      } else {
        const score = 5;
        delete this.blackjack[userId];
        this.changeUserSize(chatId, userId, username, score);
        this.updateUser(chatId, userId, 'blackjack');
        return `Вы выиграли! Ваш размер увеличен на ${score}.`;
      }
    }

    return `Ваш текущий счёт ${this.blackjack[userId]}`;
  }

  async spinWheel(
    chatId: number,
    userId: number,
    username: string,
  ): Promise<string[] | string> {
    let animationFrames: string[] = [];

    // "Анимация" прокрутки
    for (let i = 0; i < 4; i++) {
      const tempPrize =
        this.prizes[this.getRandomNumber(0, this.prizes.length - 1)].name;
      animationFrames.push(`Колесо Фортуны крутится... ${tempPrize}.`);
    }

    // Выбираем итоговый приз
    const random = this.getRandomNumber(0, 100);
    let sum = 0;
    for (const prize of this.prizes) {
      sum += prize.chance;
      if (random < sum) {
        if (prize.value === 0) {
          animationFrames.push(`В следующий раз повезёт больше!`);
        } else {
          this.changeUserSize(chatId, userId, username, prize.value);

          animationFrames.push(`Поздравляем! Вы выиграли ${prize.name}!`);
        }

        this.updateUser(chatId, userId, 'spin');
        return animationFrames;
      }
    }

    animationFrames.push('Андрей ты сломал всё!!!');

    return animationFrames;
  }

  // Создание колоды
  private createDeck(): TCard[] {
    const suits = ['♥️', '♦️', '♣️', '♠️'];
    const values = [
      ...Array.from({ length: 9 }, (_, i) => ({
        name: `${i + 2}`,
        value: i + 2,
      })),
      { name: 'J', value: 10 },
      { name: 'Q', value: 10 },
      { name: 'K', value: 10 },
      { name: 'A', value: 11 },
    ];

    return suits.flatMap((suit) =>
      values.map((v) => ({ ...v, name: `${v.name} - ${suit}` })),
    );
  }

  // Взять случайную карту из колоды
  private drawCard(deck: TCard[]): TCard {
    const index = Math.floor(Math.random() * deck.length);
    const card = deck[index];
    deck.splice(index, 1);

    return card;
  }

  private getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  private generateGrid(): string[][] {
    let grid: string[][] = [];

    for (let i = 0; i < 3; i++) {
      let row: string[] = [];

      for (let j = 0; j < 3; j++) {
        row.push(this.symbols[Math.floor(Math.random() * this.symbols.length)]);
      }

      grid.push(row);
    }

    return grid;
  }

  private formatGrid(grid: string[][]): string {
    let result = 'Результат:\n\n';

    for (let row of grid) {
      result += '| ' + row.join(' | ') + ' |\n';
    }

    return result + '\n';
  }

  private checkForWin(grid: string[][]): {
    winMessages: string[];
    lostMessages: string[];
    length: number;
  } {
    let winMessages: string[] = [];
    let lostMessages: string[] = [];
    let length = 0;

    // Check Rows
    for (let row of grid) {
      let uniqueSymbols = new Set(row);

      if (uniqueSymbols.size === 1) {
        winMessages.push(
          'Три одинаковых символа в одной строке. Поздравляем!\n',
        );
        length += 5;
      }
    }

    // Check Columns
    for (let col = 0; col < 3; col++) {
      if (grid[0][col] === grid[1][col] && grid[1][col] === grid[2][col]) {
        winMessages.push(
          'Три одинаковых символа в одной колонне. Поздравляем!\n',
        );
        length += 5;
      }
    }

    // Check Main Diagonal
    if (grid[0][0] === grid[1][1] && grid[1][1] === grid[2][2]) {
      if (grid[0][0] === '💩') {
        lostMessages.push(
          'Диагональная комбинация 💩💩💩 обнаружена. Сочувствуем!\n',
        );
        length -= 15;
      } else {
        winMessages.push('Диагональная комбинация обнаружена. Поздравляем!\n');
        length += 5;
      }
    }

    // Check Secondary Diagonal
    if (grid[0][2] === grid[1][1] && grid[1][1] === grid[2][0]) {
      if (grid[0][2] === '💩') {
        lostMessages.push(
          'Диагональная комбинация 💩💩💩 обнаружена. Сочувствуем!\n',
        );
        length -= 15;
      } else {
        winMessages.push('Диагональная комбинация обнаружена. Поздравляем!\n');
        length += 5;
      }
    }

    // Check 2x2 Squares
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        if (
          grid[i][j] === grid[i + 1][j] &&
          grid[i + 1][j] === grid[i][j + 1] &&
          grid[i][j + 1] === grid[i + 1][j + 1]
        ) {
          winMessages.push('Квадрат из одинаковых символов. Поздравляем!\n');
          length += 10;
        }
      }
    }

    return { winMessages, lostMessages, length };
  }

  private createFinalMessage(
    winMessages: string[],
    lostMessages: string[],
    length: number,
    formattedGrid: string,
    chatId: number,
    userId: number,
    username: string,
  ): string {
    let result = formattedGrid;

    if (winMessages.length > 0) {
      result += winMessages.join('\n') + '\n';
      result += lostMessages.join('\n') + '\n';

      this.changeUserSize(chatId, userId, username, length);

      result += `Ваш размер был увеличен на ${length}.`;
    } else if (lostMessages.length > 0) {
      result += lostMessages.join('\n') + '\n';

      this.changeUserSize(chatId, userId, username, length);

      result += 'К сожалению, вы проиграли. Попробуйте ещё раз!\n';
      result += `\nВаш размер был уменьшен на ${length * -1}.`;
    } else {
      length -= 2;

      this.changeUserSize(chatId, userId, username, length);

      result += 'К сожалению, вы проиграли. Попробуйте ещё раз!\n';
      result += `\nВаш размер был уменьшен на ${length * -1}.`;
    }

    this.updateUser(chatId, userId, 'slotmachine');

    return result;
  }

  private updateUser(
    chatId: number,
    userId: number,
    date: 'slotmachine' | 'blackjack' | 'spin',
  ): void {
    updateUserInFile(chatId, userId, date);
  }

  private async changeUserSize(
    chatId: number,
    userId: number,
    username: string,
    length: number,
  ) {
    const response = await this.sendPostRequest(
      `${botConfig.ondrei_url}/update_chlen_API`,
      {
        chatId,
        userId,
        username,
        length,
      },
    );

    return response;
  }

  private async sendPostRequest(url: string, params: Record<string, any>) {
    try {
      const response = this.httpService.post(url, {
        ...params,
        secretKey: process.env.CLIENT_SECRET,
      });

      return (await firstValueFrom(response)).data;
    } catch (error) {
      console.error(
        `Ошибка при отправке сообщения: ${JSON.stringify(error.data)}`,
      );
    }
  }
}
