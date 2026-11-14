import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Forecast, RouteInfo } from '@reshis-avia/shared';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastService } from './forecast.service';

@ApiTags('forecast')
@Controller()
@UseGuards(SessionAuthGuard)
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  @Get('routes')
  @ApiOperation({ summary: 'Маршруты и диапазон дат для формы прогноза' })
  routes(): RouteInfo[] {
    return this.forecast.routes();
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Прогноз продаж: медиана и 9 сценариев спроса' })
  calculate(@Query() query: ForecastQueryDto): Forecast {
    return this.forecast.forecast(query);
  }
}
