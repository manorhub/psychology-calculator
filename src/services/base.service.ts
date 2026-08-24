import { logger, type LoggerInstance } from '@/lib/logger';

export abstract class BaseService {
  protected readonly logger: LoggerInstance;

  constructor(serviceName: string) {
    this.logger = logger.child({ service: serviceName });
  }
}
