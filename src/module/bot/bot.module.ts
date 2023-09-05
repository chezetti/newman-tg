import { Module } from '@nestjs/common';

import { BotService } from './bot.service';
import { TicTacToeModule } from '../tic-tac-toe/tic-tac-toe.module';
import { CasinoModule } from '../casino/casino.module';

@Module({
  providers: [BotService],
  exports: [BotModule],
  imports: [TicTacToeModule, CasinoModule],
})
export class BotModule {}
