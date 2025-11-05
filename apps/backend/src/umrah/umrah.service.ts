import { Injectable } from '@nestjs/common';

type StepId = 'ihram'|'tawaf'|'saai'|'taqsir'|'tahalul';

@Injectable()
export class UmrahService {
  private readonly steps = [
    { id:'ihram'   as StepId, name:'Ihram',                order:1 },
    { id:'tawaf'   as StepId, name:'Tawaf',                order:2 },
    { id:'saai'    as StepId, name:"Sa'i",                 order:3 },
    { id:'taqsir'  as StepId, name:'Taqsir/Halq',          order:4 },
    { id:'tahalul' as StepId, name:'Tahalul (Exit ihram)', order:5 },
  ];

  getSteps() {
    return { steps: this.steps, total: this.steps.length };
  }

  // Read-only placeholder; later we can hydrate from DB/events.
  getProgress(userId?: string) {
    return {
      userId: userId ?? null,
      completed: [] as StepId[],
      current: 'ihram' as StepId,
      percentage: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}
