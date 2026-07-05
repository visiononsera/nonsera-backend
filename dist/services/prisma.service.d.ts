import '../config/env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
declare const prisma: PrismaClient<{
    adapter: PrismaPg;
}, never, import("../generated/prisma/runtime/client").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.service.d.ts.map