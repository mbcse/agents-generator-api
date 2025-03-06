import { StatusCodes } from "http-status-codes";

import { ElizaResponseSchema, type ElizaResponse } from "@/api/eliza/elizaModel";
import { ElizaRepository } from "@/api/eliza/elizaRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";

export class ElizaService {
  private elizaRepository: ElizaRepository;

  constructor(repository: ElizaRepository = new ElizaRepository()) {
    this.elizaRepository = repository;
  }

  // Retrieves all users from the database
  async findAll(): Promise<ServiceResponse<null>> {
    return ServiceResponse.success<null>("Users found", null);
  }

  
}

export const elizaService = new ElizaService();
