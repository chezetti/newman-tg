import { Module } from '@nestjs/common';
import { CasinoService } from './casino.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [CasinoService],
  imports: [HttpModule],
  exports: [CasinoService],
})
export class CasinoModule {}
