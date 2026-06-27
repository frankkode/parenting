import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding co-parenting wishes...");

  // Find the users
  const mum = await prisma.user.findUnique({ where: { email: "mum@parenting.app" } });
  const dad = await prisma.user.findUnique({ where: { email: "dad@parenting.app" } });

  if (!mum || !dad) {
    console.error("Mum or dad user not found. Make sure the users exist.");
    console.log("Mum:", mum?.id || "NOT FOUND");
    console.log("Dad:", dad?.id || "NOT FOUND");
    return;
  }

  // Find the first case with these parents
  let familyCase = await prisma.familyCase.findFirst({
    where: {
      parentAId: mum.id,
      parentBId: dad.id,
    },
  });

  // Or any case where they're the parents
  if (!familyCase) {
    familyCase = await prisma.familyCase.findFirst({
      where: {
        OR: [
          { parentAId: mum.id },
          { parentBId: mum.id },
          { parentAId: dad.id },
          { parentBId: dad.id },
        ],
      },
    });
  }

  if (!familyCase) {
    console.error("No case found for these parents. Creating one...");
    familyCase = await prisma.familyCase.create({
      data: {
        title: "Adam & Asher - Co-Parenting Case",
        parentAId: mum.id,
        parentBId: dad.id,
      },
    });
    console.log("Created case:", familyCase.id);
  }

  console.log(`Using case: ${familyCase.title} (${familyCase.id})`);
  console.log(`Mum (author): ${mum.name || mum.email} (${mum.id})`);
  console.log(`Dad (author): ${dad.name || dad.email} (${dad.id})`);

  // Clear existing wishes for this case
  const deleted = await prisma.coparentingWish.deleteMany({
    where: { familyCaseId: familyCase.id },
  });
  console.log(`Cleared ${deleted.count} existing wishes`);

  // Mum's 5 wishes (from her explicit statement)
  const mumWishes = [
    {
      familyCaseId: familyCase.id,
      authorId: mum.id,
      content: "Withdraw the court case concerning the children so we can cooperate effectively",
      category: "FINANCIAL_CAPACITY",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: mum.id,
      content: "Share all parental responsibilities — caring for sick children, attending school meetings, and going to all medical appointments",
      category: "CHILDCARE_CAPACITY",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: mum.id,
      content: "Respect the agreed parenting schedule and inform each other at least one week in advance if unable to spend time with the children",
      category: "CHILDCARE_CAPACITY",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: mum.id,
      content: "Maintain respectful and constructive communication always guided by the children's best interests",
      category: "EMOTIONAL_READINESS",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: mum.id,
      content: "Share the costs of everything the children need — clothing, leisure activities, and holidays/vacations",
      category: "FINANCIAL_CAPACITY",
      source: "STATEMENT",
    },
  ];

  // Dad's 5 wishes (from his statement about 50/50 custody, relocation, job constraints)
  const dadWishes = [
    {
      familyCaseId: familyCase.id,
      authorId: dad.id,
      content: "Establish a 50/50 shared custody arrangement so both parents have equal parenting time with the children",
      category: "CHILDCARE_CAPACITY",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: dad.id,
      content: "Move closer to the children's school to enable more active participation in daily childcare and school activities",
      category: "LIVING_SITUATION",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: dad.id,
      content: "Complete the informationssamtal with the municipality to formalize the separation process and co-parenting plan",
      category: "FINANCIAL_CAPACITY",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: dad.id,
      content: "Both parents should communicate respectfully, focused on the children's wellbeing rather than personal disagreements",
      category: "EMOTIONAL_READINESS",
      source: "STATEMENT",
    },
    {
      familyCaseId: familyCase.id,
      authorId: dad.id,
      content: "Support each other's relationship with the children and maintain consistent routines across both households",
      category: "CHILD_WELLBEING",
      source: "STATEMENT",
    },
  ];

  const allWishes = [...mumWishes, ...dadWishes];

  for (const wish of allWishes) {
    await prisma.coparentingWish.create({ data: wish });
  }

  console.log(`Created ${allWishes.length} wishes (${mumWishes.length} from mum, ${dadWishes.length} from dad)`);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
