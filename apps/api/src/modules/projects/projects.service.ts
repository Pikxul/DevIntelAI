import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private repo: Repository<Project>) {}

  async create(data: Partial<Project>): Promise<Project> {
    const project = this.repo.create(data);
    return this.repo.save(project);
  }

  async findAll(organizationId: string): Promise<Project[]> {
    return this.repo.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Project | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Project>): Promise<Project | null> {
    await this.repo.update(id, data);
    return this.findOne(id);
  }
}
