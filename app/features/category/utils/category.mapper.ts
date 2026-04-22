import type {
  Category,
  CategoryDTO,
} from "~/features/category/types/category.types";

export const mapCategoryDto = (dto: CategoryDTO): Category => ({
  id: dto.id,
  name: dto.name,
  slug: dto.slug,
  description: dto.description,
  parentId: dto.parentId,
  children: Array.isArray(dto.children) ? dto.children.map(mapCategoryDto) : [],
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

export const mapCategoryDtoList = (items: CategoryDTO[]) =>
  items.map(mapCategoryDto);
