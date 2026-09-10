import { CommunityEventCatalogItem } from "../../domain/entities/CommunityEventCatalogItem";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { optionalText } from "../../shared/validation/inputValidation";
import { ListCommunityEventsInput } from "../dtos/ListCommunityEventsInput";

interface ListCommunityEventsOutput {
  items: CommunityEventCatalogItem[];
  message?: string;
}

export class ListCommunityEventsUseCase {
  constructor(private readonly communityEventRepository: CommunityEventRepository) {}

  async execute(input: ListCommunityEventsInput): Promise<ListCommunityEventsOutput> {
    const category = optionalText(input.category, "La categoria", 80);
    const search = optionalText(input.search, "La busqueda", 200);
    const zone = optionalText(input.zone, "La zona", 120);
    const dateText = optionalText(input.date, "La fecha", 64);
    const date = dateText ? new Date(dateText) : undefined;

    if (input.date && (!date || Number.isNaN(date.getTime()))) {
      throw new ValidationError("La fecha indicada no es valida.");
    }

    const items = await this.communityEventRepository.findActiveCatalog({
      category,
      search,
      zone,
      date,
      availableOnly: input.availableOnly,
      upcomingOnly: input.upcomingOnly
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
