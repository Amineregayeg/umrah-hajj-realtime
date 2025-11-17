import { Module } from '@nestjs/common';
import { UmrahKnowledgeService } from './umrah-knowledge.service';

@Module({
  providers: [UmrahKnowledgeService],
  exports: [UmrahKnowledgeService],
})
export class UmrahKnowledgeModule {}
