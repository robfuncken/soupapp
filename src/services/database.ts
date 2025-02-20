import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SoupWithLocations {
  id: number;
  naam: string;
  vegetarisch: boolean;
  datum: Date;
  locaties: {
    prijs: number;
    location: {
      naam: string;
    };
  }[];
}

export const DatabaseService = {
  async getSoupsForDate(date: Date): Promise<SoupWithLocations[]> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return prisma.soup.findMany({
      where: {
        datum: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        locaties: {
          include: {
            location: true,
          },
        },
      },
    });
  },

  async getSoupsForLocation(
    locationName: string,
    date: Date
  ): Promise<SoupWithLocations[]> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return prisma.soup.findMany({
      where: {
        datum: {
          gte: startOfDay,
          lte: endOfDay,
        },
        locaties: {
          some: {
            location: {
              naam: locationName,
            },
          },
        },
      },
      include: {
        locaties: {
          include: {
            location: true,
          },
        },
      },
    });
  },

  async addSoup(
    naam: string,
    vegetarisch: boolean,
    datum: Date,
    locations: { locationNaam: string; prijs: number }[]
  ): Promise<SoupWithLocations> {
    // @ts-ignore
    return prisma.$transaction(async (tx: any) => {
      const soup = await tx.soup.create({
        data: {
          naam,
          vegetarisch,
          datum,
          locaties: {
            create: await Promise.all(
              locations.map(async (loc) => {
                const location = await tx.location.findUnique({
                  where: { naam: loc.locationNaam },
                });
                if (!location) {
                  throw new Error(`Location ${loc.locationNaam} not found`);
                }
                return {
                  prijs: loc.prijs,
                  location: {
                    connect: { id: location.id },
                  },
                };
              })
            ),
          },
        },
        include: {
          locaties: {
            include: {
              location: true,
            },
          },
        },
      });
      return soup;
    });
  },

  async updateSoupPrice(
    soupId: number,
    locationNaam: string,
    newPrijs: number
  ): Promise<void> {
    await prisma.soupLocation.update({
      where: {
        soupId_locationId: {
          soupId,
          locationId: (
            await prisma.location.findUniqueOrThrow({
              where: { naam: locationNaam },
            })
          ).id,
        },
      },
      data: {
        prijs: newPrijs,
      },
    });
  },

  async getAllLocations() {
    return prisma.location.findMany({
      select: {
        naam: true,
      },
    });
  },

  async deleteSoup(soupId: number): Promise<void> {
    await prisma.soup.delete({
      where: {
        id: soupId,
      },
    });
  },
};
