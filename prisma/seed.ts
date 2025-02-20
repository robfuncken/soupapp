import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create locations
  const locations = [
    { naam: "HQ" },
    { naam: "HSL" },
    { naam: "LD" }
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { naam: location.naam },
      update: {},
      create: location
    });
  }

  // Create some sample soups for today and tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const soups = [
    {
      naam: "Tomatensoep met Balletjes",
      vegetarisch: false,
      datum: today,
      locaties: {
        create: [
          { prijs: 2.50, location: { connect: { naam: "HQ" } } },
          { prijs: 2.75, location: { connect: { naam: "HSL" } } }
        ]
      }
    },
    {
      naam: "Groentesoep",
      vegetarisch: true,
      datum: today,
      locaties: {
        create: [
          { prijs: 2.50, location: { connect: { naam: "LD" } } },
          { prijs: 2.50, location: { connect: { naam: "HQ" } } }
        ]
      }
    },
    {
      naam: "Champignonsoep",
      vegetarisch: true,
      datum: tomorrow,
      locaties: {
        create: [
          { prijs: 2.50, location: { connect: { naam: "HQ" } } },
          { prijs: 2.50, location: { connect: { naam: "HSL" } } },
          { prijs: 2.50, location: { connect: { naam: "LD" } } }
        ]
      }
    }
  ];

  for (const soup of soups) {
    await prisma.soup.create({
      data: soup
    });
  }

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 