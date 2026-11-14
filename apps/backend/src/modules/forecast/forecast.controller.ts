import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Forecast, ForecastDay, RouteInfo } from '@reshis-avia/shared';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  ForecastCalendarQueryDto,
  ForecastQueryDto,
} from './dto/forecast-query.dto';
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
  @ApiOperation({
    summary:
      'Прогноз продаж: медиана, 9 сценариев спроса, лучшая цена и маржинальная прибыль',
  })
  calculate(@Query() query: ForecastQueryDto): Forecast {
    return this.forecast.forecast(query);
  }

  @Get('forecast/calendar')
  @ApiOperation({
    summary: 'Прогноз продаж по медиане на все даты маршрута при одной цене',
  })
  calendar(@Query() query: ForecastCalendarQueryDto): ForecastDay[] {
    return this.forecast.calendar(query);
  }
}
