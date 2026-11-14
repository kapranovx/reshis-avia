import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ForecastController } from './forecast.controller';
import {
  DEFAULT_FORECAST_CSV,
  DEFAULT_ROUTES_CSV,
  loadForecastData,
  resolveDataPath,
} from './forecast.data';
import { FORECAST_DATA, ForecastService } from './forecast.service';

// Данные читаются один раз при старте. Ошибка в файле не даёт запуститься,
// чтобы сервис не отвечал неверными цифрами.
@Module({
  imports: [AuthModule],
  controllers: [ForecastController],
  providers: [
    {
      provide: FORECAST_DATA,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const paths = {
          forecast: resolveDataPath(
            config.get<string>('FORECAST_CSV'),
            DEFAULT_FORECAST_CSV,
          ),
          routes: resolveDataPath(
            config.get<string>('ROUTES_CSV'),
            DEFAULT_ROUTES_CSV,
          ),
        };
        const data = loadForecastData(paths);
        new Logger('Forecast').log(
          `Загружено маршрутов: ${data.routes.length}, рейсов: ${data.flights.size} (${paths.forecast})`,
        );
        return data;
      },
    },
    ForecastService,
  ],
})
export class ForecastModule {}
