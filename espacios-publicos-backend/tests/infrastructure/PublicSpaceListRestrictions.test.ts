import { PrismaPublicSpaceRepository } from '../../src/infrastructure/database/PrismaPublicSpaceRepository';
import { prisma } from '../../src/infrastructure/database/prismaClient';
jest.mock('../../src/infrastructure/database/prismaClient', () => ({prisma:{publicSpace:{findMany:jest.fn()}}}));
describe('Listado de espacios con restricciones temporales',()=>{
  it('consulta medidas no liberadas y no vencidas sin filtrar por estado de la alerta',async()=>{
    const rows=[{id:'s1',status:'ENABLED',weatherRestrictions:[]}];
    (prisma.publicSpace.findMany as jest.Mock).mockResolvedValue(rows);
    const repository=new PrismaPublicSpaceRepository();
    expect(await repository.findAll({status:'ENABLED'})).toBe(rows);
    expect(prisma.publicSpace.findMany).toHaveBeenCalledWith({
      where:{status:'ENABLED'},orderBy:{createdAt:'desc'},
      include:{weatherRestrictions:{where:{releasedAt:null,validUntil:{gt:expect.any(Date)}},
        select:{alertId:true,validFrom:true,validUntil:true},orderBy:{validFrom:'asc'}}}
    });
  });
});
