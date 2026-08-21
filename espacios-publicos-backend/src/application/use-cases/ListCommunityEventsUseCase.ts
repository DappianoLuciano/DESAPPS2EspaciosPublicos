import { CommunityEventCatalogItem } from "../../domain/entities/CommunityEventCatalogItem";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { ListCommunityEventsInput } from "../dtos/ListCommunityEventsInput";

interface ListCommunityEventsOutput {
  items: CommunityEventCatalogItem[];
  message?: string;
}

export class ListCommunityEventsUseCase {
  constructor(private readonly communityEventRepository: CommunityEventRepository) {}

  async execute(input: ListCommunityEventsInput): Promise<ListCommunityEventsOutput> {
    const date = input.date ? new Date(input.date) : undefined;

    if (input.date && (!date || Number.isNaN(date.getTime()))) {
      throw new ValidationError("La fecha indicada no es valida.");
    }

    const items = await this.communityEventRepository.findActiveCatalog({
      category: input.category,
      zone: input.zone,
      date,
      availableOnly: input.availableOnly
    });

    if (items.length === 0) {
      return {
        items,
        message: "No hay eventos que cumplan los filtros aplicados. Proba ajustando categoria, zona o fecha."
      };
    }

    return { items };
  }
}
