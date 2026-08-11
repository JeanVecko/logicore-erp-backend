/**
 * Contrat générique du Repository Pattern utilisé par tous les modules métier.
 * Chaque repository concret (ex: UsersRepository) l'implémente au-dessus de PrismaService,
 * afin que les Services ne dépendent jamais directement de Prisma.
 */
export interface IBaseRepository<TEntity, TCreateInput, TUpdateInput, TWhereInput = Record<string, unknown>> {
  findAll(where?: TWhereInput, skip?: number, take?: number): Promise<TEntity[]>;
  count(where?: TWhereInput): Promise<number>;
  findById(id: string): Promise<TEntity | null>;
  create(data: TCreateInput): Promise<TEntity>;
  update(id: string, data: TUpdateInput): Promise<TEntity>;
  delete(id: string): Promise<TEntity>;
}
