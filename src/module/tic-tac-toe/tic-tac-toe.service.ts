import { Injectable } from '@nestjs/common';

import { IGame } from './interfaces/game.interface';

@Injectable()
export class TicTacToeService {
  private games: { [chatId: number]: IGame } = {};

  createGame(
    chatId: number,
    username: string,
    choice: string,
    opponentId?: string,
  ): string {
    if (choice !== 'X' && choice !== 'O') {
      return 'Неверный выбор. Выберите "X" или "O"';
    }

    opponentId = opponentId ?? '-1';

    this.games[chatId] = {
      board: [
        ['-', '-', '-'],
        ['-', '-', '-'],
        ['-', '-', '-'],
      ],
      players: {
        [username]: choice,
        [opponentId.toString()]: choice === 'X' ? 'O' : 'X',
      },
      turn: username,
    };
    return (
      `Новая игра началась.\n\n` + this.formatBoard(this.games[chatId].board)
    );
  }

  play(chatId: number, userId: string, x: number, y: number): string {
    if (!this.games[chatId]) {
      return 'Игра не найдена. Введите /tictactoe, чтобы начать новую игру.';
    }

    const game = this.games[chatId];

    if (game.turn.toString() !== userId.toString()) {
      return `Сейчас ход игрока ${game.turn === '-1' ? 'Newman' : game.turn}.`;
    }

    const player = game.players[userId];

    if (!player) {
      return 'Вы не являетесь участником этой игры.';
    }

    // Уменьшаем x и y на 1, чтобы счет шел с 1, а не с 0
    x -= 1;
    y -= 1;

    if (x < 0 || x >= 3 || y < 0 || y >= 3) {
      return 'Недопустимые координаты. Введите числа от 1 до 3.';
    }

    if (game.board[x][y] !== '-') {
      return 'Недопустимый ход';
    }

    game.board[x][y] = player;
    game.turn = this.getOpponent(game, userId);

    if (this.checkWinner(game.board, player)) {
      delete this.games[chatId]; // Удаление игры
      game.turn = userId; // Сбрасываем ход на последнего ходившего (победителя)
      const winner = game.turn === '-1' ? 'Newman' : game.turn;

      return `Игрок ${winner} выиграл!\n\n` + this.formatBoard(game.board);
    }

    if (this.checkDraw(game.board)) {
      delete this.games[chatId]; // Удаление игры
      return `Ничья!\n\n` + this.formatBoard(game.board);
    }

    if (game.turn === '-1') {
      this.botMove(chatId, userId);

      // Добавим здесь проверку победы для бота
      if (this.checkWinner(game.board, game.players['-1'])) {
        delete this.games[chatId]; // Удаление игры
        return `Бот выиграл!\n\n` + this.formatBoard(game.board);
      }

      return `Бот сделал ход:\n\n${this.formatBoard(game.board)}`;
    }

    return 'Ход принят\n\n' + this.formatBoard(game.board);
  }

  private botMove(chatId: number, userId: string) {
    const game = this.games[chatId];
    const botPlayer = game.players['-1'];
    const humanPlayer = game.players[this.getOpponent(game, userId)];

    let bestScore = -Infinity;
    let move;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (game.board[i][j] === '-') {
          game.board[i][j] = botPlayer;
          const score = this.minimax(
            game.board,
            0,
            false,
            botPlayer,
            humanPlayer,
          );
          game.board[i][j] = '-';
          if (score > bestScore) {
            bestScore = score;
            move = { i, j };
          }
        }
      }
    }

    if (move) {
      game.board[move.i][move.j] = botPlayer;
      game.turn = this.getOpponent(game, '-1');
    }
  }

  private minimax(
    board: string[][],
    depth: number,
    maximizing: boolean,
    botPlayer: string,
    humanPlayer: string,
  ): number {
    const scores = {
      [botPlayer]: 1,
      [humanPlayer]: -1,
      draw: 0,
    };

    if (this.checkWinner(board, botPlayer)) return scores[botPlayer];
    if (this.checkWinner(board, humanPlayer)) return scores[humanPlayer];
    if (this.checkDraw(board)) return scores['draw'];

    if (maximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[i][j] === '-') {
            board[i][j] = botPlayer;
            const score = this.minimax(
              board,
              depth + 1,
              false,
              botPlayer,
              humanPlayer,
            );
            board[i][j] = '-';
            bestScore = Math.max(score, bestScore);
          }
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[i][j] === '-') {
            board[i][j] = humanPlayer;
            const score = this.minimax(
              board,
              depth + 1,
              true,
              botPlayer,
              humanPlayer,
            );
            board[i][j] = '-';
            bestScore = Math.min(score, bestScore);
          }
        }
      }
      return bestScore;
    }
  }

  private checkWinner(board: string[][], player: string): boolean {
    for (let i = 0; i < 3; i++) {
      if (board[i].every((cell) => cell === player)) return true; // Row
      if (board.map((row) => row[i]).every((cell) => cell === player))
        return true; // Column
    }
    if ([0, 1, 2].map((i) => board[i][i]).every((cell) => cell === player))
      return true; // Diagonal
    if ([0, 1, 2].map((i) => board[i][2 - i]).every((cell) => cell === player))
      return true; // Anti-diagonal
    return false;
  }

  private checkDraw(board: string[][]): boolean {
    return board.flat().every((cell) => cell !== '-');
  }

  private formatBoard(board: string[][]): string {
    let prettyBoard = '';
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        let cell = board[i][j];
        if (cell === 'X') cell = 'x';
        else if (cell === 'O') cell = 'o';
        else cell = '□';
        prettyBoard += `│${cell}`;
      }
      prettyBoard += '│\n';
    }
    return prettyBoard;
  }

  private getOpponent(game: IGame, userId: string): string {
    const opponentId = Object.keys(game.players).find(
      (id) => id !== userId.toString(),
    );

    return opponentId ? opponentId : userId;
  }
}
