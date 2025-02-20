"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SoupWithLocation = {
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
};

export async function getSoups(): Promise<SoupWithLocation[]> {
  return await prisma.soup.findMany({
    include: {
      locaties: {
        include: {
          location: true,
        },
      },
    },
    orderBy: {
      datum: "desc",
    },
  });
}

export async function getLocations() {
  return await prisma.location.findMany({
    orderBy: {
      naam: "asc",
    },
  });
}

export async function addSoup(formData: FormData) {
  const naam = formData.get("naam") as string;
  const vegetarisch = formData.get("vegetarisch") === "true";
  const datum = new Date(formData.get("datum") as string);

  // Extract location prices from form data
  const locationPrices: { locationId: number; prijs: number }[] = [];
  const entries = Array.from(formData.entries());

  entries.forEach(([key, value]) => {
    if (key.startsWith("locationPrices[")) {
      const match = key.match(/locationPrices\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const [, index, field] = match;
        if (!locationPrices[parseInt(index)]) {
          locationPrices[parseInt(index)] = { locationId: 0, prijs: 0 };
        }
        if (field === "locationId") {
          locationPrices[parseInt(index)].locationId = parseInt(
            value as string
          );
        } else if (field === "prijs") {
          locationPrices[parseInt(index)].prijs = parseFloat(value as string);
        }
      }
    }
  });

  const soup = await prisma.soup.create({
    data: {
      naam,
      vegetarisch,
      datum,
      locaties: {
        create: locationPrices.map((lp) => ({
          locationId: lp.locationId,
          prijs: lp.prijs,
        })),
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

  revalidatePath("/admin");
  return soup;
}

export async function deleteSoup(id: number) {
  // First delete all related SoupLocation records
  await prisma.soupLocation.deleteMany({
    where: {
      soupId: id,
    },
  });

  // Then delete the soup
  await prisma.soup.delete({
    where: {
      id,
    },
  });
  revalidatePath("/admin");
}
