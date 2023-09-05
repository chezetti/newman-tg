import { ConfigModule } from '@nestjs/config';

export const configModule = ConfigModule.forRoot({
  envFilePath: ['.env.development', '.env.production'],
  isGlobal: true,
});
