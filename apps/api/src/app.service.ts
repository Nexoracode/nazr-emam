import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'nazr-emam-api',
      timestamp: new Date().toISOString(),
    };
  }

  getProject() {
    return {
      name: 'Nazr Emam',
      description: 'Initial API for the Nazr Emam project',
      workflow: ['register-request', 'review-request', 'track-status'],
    };
  }
}
