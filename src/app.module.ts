import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';

import { configModule } from 'src/config.root';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from 'src/module/bot/bot.module';
import { TicTacToeModule } from './module/tic-tac-toe/tic-tac-toe.module';
import { CasinoModule } from './module/casino/casino.module';

@Module({
  imports: [
    configModule,
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN,
    }),
    BotModule,
    TicTacToeModule,
    CasinoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
