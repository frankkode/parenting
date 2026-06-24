import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const adminHash = await hash("admin123", 12);
  const mediatorHash = await hash("mediator123", 12);
  const parentAHash = await hash("parent123", 12);
  const parentBHash = await hash("parent123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@coparent.com" },
    update: {},
    create: {
      email: "admin@coparent.com",
      name: "Admin User",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+1234567890",
      bio: "Platform administrator",
    },
  });

  const mediator = await prisma.user.upsert({
    where: { email: "mediator@coparent.com" },
    update: {},
    create: {
      email: "mediator@coparent.com",
      name: "Jane Mediator",
      passwordHash: mediatorHash,
      role: "MEDIATOR",
      phone: "+1234567891",
      bio: "Certified family mediator with 10 years experience",
      profession: "Family Mediator",
    },
  });

  const parentA = await prisma.user.upsert({
    where: { email: "parentA@coparent.com" },
    update: {},
    create: {
      email: "parentA@coparent.com",
      name: "Parent A (Sarah)",
      passwordHash: parentAHash,
      role: "PARENT",
      phone: "+1234567892",
      address: "123 Main St, Springfield",
      profession: "Teacher",
    },
  });

  const parentB = await prisma.user.upsert({
    where: { email: "parentB@coparent.com" },
    update: {},
    create: {
      email: "parentB@coparent.com",
      name: "Parent B (Michael)",
      passwordHash: parentBHash,
      role: "PARENT",
      phone: "+1234567893",
      address: "456 Oak Ave, Springfield",
      profession: "Engineer",
    },
  });

  console.log("Users created");

  // Create family case
  const familyCase = await prisma.familyCase.create({
    data: {
      title: "Smith Family Co-Parenting",
      status: "ACTIVE",
      parentAId: parentA.id,
      parentBId: parentB.id,
      mediatorId: mediator.id,
      children: {
        create: [
          { name: "Emma Smith", age: 8, school: "Springfield Elementary", grade: "3rd" },
          { name: "Liam Smith", age: 5, school: "Springfield Elementary", grade: "Kindergarten" },
        ],
      },
    },
  });

  console.log("Family case created");

  // Create comprehensive assessment questions across 5 key categories
  // Each category has SLIDER (0-10 scoring) questions for quantitative analysis
  const questionData: Array<{
    text: string;
    category: string;
    subcategory?: string;
    type: string;
    options?: string;
    order: number;
  }> = [
    // ===== LIVING SITUATION (order 1-5) =====
    { text: "How would you rate the stability of your current housing situation?", category: "LIVING_SITUATION", subcategory: "housing_stability", type: "SLIDER", order: 1 },
    { text: "How suitable is your home for the child(ren) (space, safety, amenities)?", category: "LIVING_SITUATION", subcategory: "home_suitability", type: "SLIDER", order: 2 },
    { text: "How would you rate the safety of your neighborhood for children?", category: "LIVING_SITUATION", subcategory: "neighborhood_safety", type: "SLIDER", order: 3 },
    { text: "How far do you live from the children's school?", category: "LIVING_SITUATION", subcategory: "school_proximity", type: "SINGLE_CHOICE", options: JSON.stringify(["Less than 1 mile", "1-5 miles", "5-15 miles", "15+ miles"]), order: 4 },
    { text: "Are you willing to relocate closer to the children's school or activities if needed?", category: "LIVING_SITUATION", subcategory: "relocation_willingness", type: "SINGLE_CHOICE", options: JSON.stringify(["Yes, immediately", "Yes, eventually", "Maybe", "No"]), order: 5 },

    // ===== WORK SITUATION (order 6-10) =====
    { text: "How would you rate your work schedule flexibility for childcare needs?", category: "WORK_SITUATION", subcategory: "schedule_flexibility", type: "SLIDER", order: 6 },
    { text: "How many hours per week do you typically work?", category: "WORK_SITUATION", subcategory: "work_hours", type: "SINGLE_CHOICE", options: JSON.stringify(["Part-time (<30 hrs)", "Full-time (30-40 hrs)", "Full-time (40-50 hrs)", "50+ hrs"]), order: 7 },
    { text: "Can you work remotely or adjust your schedule for child emergencies?", category: "WORK_SITUATION", subcategory: "emergency_flexibility", type: "SLIDER", order: 8 },
    { text: "How stable is your current employment situation?", category: "WORK_SITUATION", subcategory: "job_stability", type: "SLIDER", order: 9 },
    { text: "How does your commute time affect your availability for the children?", category: "WORK_SITUATION", subcategory: "commute_impact", type: "SLIDER", order: 10 },

    // ===== CHILDCARE CAPACITY (order 11-16) =====
    { text: "How would you rate your overall ability to handle daily childcare responsibilities?", category: "CHILDCARE_CAPACITY", subcategory: "daily_care", type: "SLIDER", order: 11 },
    { text: "How available are you on weekends for childcare?", category: "CHILDCARE_CAPACITY", subcategory: "weekend_availability", type: "SLIDER", order: 12 },
    { text: "How confident are you in handling medical appointments and health needs?", category: "CHILDCARE_CAPACITY", subcategory: "medical_care", type: "SLIDER", order: 13 },
    { text: "How would you rate your ability to help with homework and education?", category: "CHILDCARE_CAPACITY", subcategory: "education_support", type: "SLIDER", order: 14 },
    { text: "How often can you provide transportation to activities and appointments?", category: "CHILDCARE_CAPACITY", subcategory: "transportation", type: "SLIDER", order: 15 },
    { text: "Do you have reliable backup childcare (family, friends, babysitter)?", category: "CHILDCARE_CAPACITY", subcategory: "backup_care", type: "SINGLE_CHOICE", options: JSON.stringify(["Always available", "Usually available", "Sometimes available", "Rarely available"]), order: 16 },

    // ===== FINANCIAL CAPACITY (order 17-21) =====
    { text: "How would you rate your ability to meet the children's financial needs (food, clothing, activities)?", category: "FINANCIAL_CAPACITY", subcategory: "basic_needs", type: "SLIDER", order: 17 },
    { text: "How would you rate your ability to contribute to education expenses?", category: "FINANCIAL_CAPACITY", subcategory: "education_expenses", type: "SLIDER", order: 18 },
    { text: "How would you rate your ability to cover medical and healthcare expenses?", category: "FINANCIAL_CAPACITY", subcategory: "medical_expenses", type: "SLIDER", order: 19 },
    { text: "How would you rate your ability to save for the children's future needs?", category: "FINANCIAL_CAPACITY", subcategory: "future_savings", type: "SLIDER", order: 20 },
    { text: "How do you feel about the current child expense sharing arrangement?", category: "FINANCIAL_CAPACITY", subcategory: "expense_sharing", type: "SINGLE_CHOICE", options: JSON.stringify(["Very fair", "Mostly fair", "Somewhat unfair", "Very unfair"]), order: 21 },

    // ===== EMOTIONAL READINESS (order 22-28) =====
    { text: "How would you rate your current emotional well-being?", category: "EMOTIONAL_READINESS", subcategory: "emotional_wellbeing", type: "SLIDER", order: 22 },
    { text: "How well do you manage stress related to co-parenting?", category: "EMOTIONAL_READINESS", subcategory: "stress_management", type: "SLIDER", order: 23 },
    { text: "How would you rate your ability to separate parenting issues from personal feelings?", category: "EMOTIONAL_READINESS", subcategory: "emotional_separation", type: "SLIDER", order: 24 },
    { text: "How willing are you to compromise with the other parent?", category: "EMOTIONAL_READINESS", subcategory: "compromise_willingness", type: "SLIDER", order: 25 },
    { text: "How would you rate the quality of communication with the other parent?", category: "EMOTIONAL_READINESS", subcategory: "communication_quality", type: "SLIDER", order: 26 },
    { text: "How often do conflicts arise in your co-parenting communication?", category: "EMOTIONAL_READINESS", subcategory: "conflict_frequency", type: "SINGLE_CHOICE", options: JSON.stringify(["Never", "Rarely", "Sometimes", "Frequently"]), order: 27 },
    { text: "Do you feel you have adequate emotional support (friends, family, therapist)?", category: "EMOTIONAL_READINESS", subcategory: "support_network", type: "SLIDER", order: 28 },

    // ===== CHILD WELLBEING (order 29-35) =====
    { text: "How would you rate the stability of the children's current routine?", category: "CHILD_WELLBEING", subcategory: "routine_stability", type: "SLIDER", order: 29 },
    { text: "How well are the children's emotional needs being met in the current arrangement?", category: "CHILD_WELLBEING", subcategory: "emotional_needs", type: "SLIDER", order: 30 },
    { text: "How would you rate the educational support the children receive?", category: "CHILD_WELLBEING", subcategory: "education_support", type: "SLIDER", order: 31 },
    { text: "How well are the children maintaining their social life and friendships?", category: "CHILD_WELLBEING", subcategory: "social_life", type: "SLIDER", order: 32 },
    { text: "How would you rate your understanding of the children's individual needs?", category: "CHILD_WELLBEING", subcategory: "child_understanding", type: "SLIDER", order: 33 },
    { text: "How much does the current arrangement disrupt the children's daily life?", category: "CHILD_WELLBEING", subcategory: "disruption_level", type: "SLIDER", order: 34 },
    { text: "How would you rate the children's overall happiness and well-being?", category: "CHILD_WELLBEING", subcategory: "overall_happiness", type: "SLIDER", order: 35 },
  ];

  const questions = await Promise.all(
    questionData.map((q) =>
      prisma.question.create({
        data: {
          text: q.text,
          category: q.category,
          subcategory: q.subcategory || null,
          type: q.type,
          options: q.options || null,
          order: q.order,
        },
      })
    )
  );

  console.log(`Created ${questions.length} questions across 6 categories`);

  // Create sample assessment for Parent A
  const assessmentA = await prisma.assessment.create({
    data: {
      familyCaseId: familyCase.id,
      userId: parentA.id,
      type: "CO_PARENTING",
      status: "COMPLETED",
      score: 75,
      answers: {
        create: questions.map((q) => ({
          questionId: q.id,
          userId: parentA.id,
          value: q.type === "SLIDER" ? String(Math.floor(Math.random() * 4) + 6) : JSON.stringify({ selected: "Yes" }),
          score: q.type === "SLIDER" ? Math.floor(Math.random() * 4) + 6 : null,
        })),
      },
    },
  });

  // Create sample assessment for Parent B
  const assessmentB = await prisma.assessment.create({
    data: {
      familyCaseId: familyCase.id,
      userId: parentB.id,
      type: "CO_PARENTING",
      status: "COMPLETED",
      score: 68,
      answers: {
        create: questions.map((q) => ({
          questionId: q.id,
          userId: parentB.id,
          value: q.type === "SLIDER" ? String(Math.floor(Math.random() * 5) + 4) : JSON.stringify({ selected: "Maybe" }),
          score: q.type === "SLIDER" ? Math.floor(Math.random() * 5) + 4 : null,
        })),
      },
    },
  });

  console.log("Assessments created with scored answers");

  // Create sample messages
  await prisma.message.createMany({
    data: [
      {
        familyCaseId: familyCase.id,
        senderId: parentA.id,
        recipientId: parentB.id,
        content: "Hi Michael, I wanted to discuss Emma's upcoming school play. It's on Friday at 6pm. Can you make it?",
        type: "MESSAGE",
        createdAt: new Date("2026-06-20"),
      },
      {
        familyCaseId: familyCase.id,
        senderId: parentB.id,
        recipientId: parentA.id,
        content: "Yes, I'll be there. Should we coordinate about who brings her?",
        type: "MESSAGE",
        createdAt: new Date("2026-06-20"),
      },
      {
        familyCaseId: familyCase.id,
        senderId: parentA.id,
        recipientId: parentB.id,
        content: "That would be great. I can pick her up from school and bring her costume. You can meet us there.",
        type: "MESSAGE",
        createdAt: new Date("2026-06-21"),
      },
      {
        familyCaseId: familyCase.id,
        senderId: parentB.id,
        recipientId: parentA.id,
        content: "Sounds like a plan. Also, don't forget Liam has his dentist appointment next Tuesday at 10am.",
        type: "MESSAGE",
        createdAt: new Date("2026-06-21"),
      },
    ],
  });

  console.log("Messages created");

  // Create sample calendar events
  await prisma.calendarEvent.createMany({
    data: [
      {
        familyCaseId: familyCase.id,
        userId: parentA.id,
        title: "Emma's School Play",
        description: "Springfield Elementary auditorium",
        startDate: new Date("2026-06-27T18:00:00"),
        endDate: new Date("2026-06-27T20:00:00"),
        type: "SCHOOL",
      },
      {
        familyCaseId: familyCase.id,
        userId: parentB.id,
        title: "Liam - Dentist Appointment",
        description: "Dr. Smith Dental Clinic",
        startDate: new Date("2026-06-24T10:00:00"),
        endDate: new Date("2026-06-24T11:00:00"),
        type: "MEDICAL",
      },
      {
        familyCaseId: familyCase.id,
        userId: parentA.id,
        title: "Parenting Time - Weekend with Parent A",
        startDate: new Date("2026-06-28T09:00:00"),
        endDate: new Date("2026-06-29T18:00:00"),
        type: "PARENTING_SCHEDULE",
        color: "#3B82F6",
      },
      {
        familyCaseId: familyCase.id,
        userId: parentB.id,
        title: "Soccer Practice - Emma",
        description: "Springfield Park Field 2",
        startDate: new Date("2026-06-25T16:00:00"),
        endDate: new Date("2026-06-25T17:30:00"),
        type: "ACTIVITY",
        color: "#8B5CF6",
      },
    ],
  });

  console.log("Calendar events created");

  // Create sample help request
  await prisma.helpRequest.create({
    data: {
      familyCaseId: familyCase.id,
      requesterId: parentA.id,
      responderId: parentB.id,
      title: "Need help with weekend childcare",
      description: "I have a work conference this Saturday and need someone to watch the kids from 9am to 3pm.",
      type: "WEEKEND_CHILDCARE",
      status: "ACCEPTED",
      urgency: "NORMAL",
      acceptedAt: new Date(),
    },
  });

  console.log("Help request created");

  // Create sample agreement
  await prisma.agreement.create({
    data: {
      familyCaseId: familyCase.id,
      title: "Summer Holiday Schedule 2026",
      description: "Agreed schedule for summer holidays including vacation weeks and activities",
      type: "HOLIDAY",
      status: "ACCEPTED",
      content: JSON.stringify({
        schedule: "Alternating weeks",
        startDate: "2026-06-15",
        endDate: "2026-08-31",
        specialDates: [],
      }),
      createdById: parentA.id,
      acceptedById: parentB.id,
      acceptedAt: new Date("2026-06-15"),
    },
  });

  console.log("Agreement created");

  // Create sample responsibility items
  await prisma.responsibilityItem.createMany({
    data: [
      {
        familyCaseId: familyCase.id,
        title: "School Pickup",
        category: "SCHOOL",
        parentAScore: 8,
        parentBScore: 4,
        recommended: "PARENT_A",
        status: "ASSIGNED",
      },
      {
        familyCaseId: familyCase.id,
        title: "School Drop-off",
        category: "SCHOOL",
        parentAScore: 6,
        parentBScore: 7,
        recommended: "PARENT_B",
        status: "ASSIGNED",
      },
      {
        familyCaseId: familyCase.id,
        title: "Homework Help",
        category: "SCHOOL",
        parentAScore: 7,
        parentBScore: 7,
        recommended: "SHARED",
        status: "SHARED",
      },
      {
        familyCaseId: familyCase.id,
        title: "Doctor Visits",
        category: "HEALTHCARE",
        parentAScore: 8,
        parentBScore: 5,
        recommended: "PARENT_A",
        status: "ASSIGNED",
      },
      {
        familyCaseId: familyCase.id,
        title: "Weekend Activities",
        category: "ACTIVITIES",
        parentAScore: 7,
        parentBScore: 6,
        recommended: "SHARED",
        status: "SHARED",
      },
    ],
  });

  console.log("Responsibility items created");

  // Create mediator notes
  await prisma.mediatorNote.create({
    data: {
      familyCaseId: familyCase.id,
      mediatorId: mediator.id,
      content: "Initial assessment: Parents show willingness to cooperate but need support in communication. Conflict areas primarily around scheduling and holiday arrangements. Recommend focusing mediation on establishing clear schedules and communication protocols.",
      type: "NOTE",
    },
  });

  console.log("Mediator note created");

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: parentA.id,
        caseId: familyCase.id,
        title: "Assessment Completed",
        message: "Your co-parenting assessment has been submitted. View your results.",
        type: "SUCCESS",
      },
      {
        userId: parentB.id,
        caseId: familyCase.id,
        title: "Help Request Accepted",
        message: "Parent A has accepted your help request for weekend childcare.",
        type: "INFO",
      },
      {
        userId: mediator.id,
        caseId: familyCase.id,
        title: "New Case Assigned",
        message: "You have been assigned to the Smith Family case.",
        type: "INFO",
      },
    ],
  });

  console.log("Notifications created");

  // Create sample AI recommendation
  await prisma.aIRecommendation.create({
    data: {
      familyCaseId: familyCase.id,
      type: "RESPONSIBILITY",
      content: "Based on the assessment data, Parent A shows higher availability on weekends (score 8/10) while Parent B reports lower weekend availability (score 4/10). Consider transferring weekend childcare responsibilities primarily to Parent A, with Parent B taking on more weekday school transportation duties where they score higher (7/10 vs 6/10). This balanced approach would optimize the children's schedule stability.",
      context: JSON.stringify({
        parentAWeekends: 8,
        parentBWeekends: 4,
        parentASchoolTransport: 6,
        parentBSchoolTransport: 7,
      }),
    },
  });

  console.log("AI recommendation created");

  // Create growth records for parents
  const growthCategories = ["communication", "flexibility", "emotional_readiness", "childcare", "financial"];
  for (const category of growthCategories) {
    for (const userId of [parentA.id, parentB.id]) {
      // Create 3 monthly records per category per parent
      for (let month = 0; month < 3; month++) {
        await prisma.growthRecord.create({
          data: {
            userId,
            familyCaseId: familyCase.id,
            category,
            metric: `${category}_score`,
            score: Math.round((5 + Math.random() * 5) * 10) / 10,
            notes: `Monthly ${category} assessment - month ${month + 1}`,
            recordedAt: new Date(2026, 3 + month, 15),
          },
        });
      }
    }
  }
  console.log("Growth records created (30 records)");

  // Create child impact assessments
  const children = await prisma.child.findMany({ where: { familyCaseId: familyCase.id } });
  const impactCategories = ["school_stability", "social_life", "travel_burden", "stress_level", "routine_stability"];
  for (const child of children) {
    for (const category of impactCategories) {
      await prisma.childImpact.create({
        data: {
          familyCaseId: familyCase.id,
          childId: child.id,
          category,
          score: Math.round((5 + Math.random() * 4) * 10) / 10,
          notes: `Assessment for ${child.name} - ${category.replace(/_/g, " ")}`,
        },
      });
    }
  }
  console.log("Child impact assessments created");

  // Create conflict analysis records
  const conflictCategories = ["communication", "scheduling", "financial", "parenting_style", "emotional"];
  for (const category of conflictCategories) {
    await prisma.conflictAnalysis.create({
      data: {
        familyCaseId: familyCase.id,
        category,
        score: Math.round((1 + Math.random() * 8) * 10) / 10,
        details: JSON.stringify({
          parentAView: `Parent A perspective on ${category}`,
          parentBView: `Parent B perspective on ${category}`,
          gap: Math.round(Math.random() * 6 * 10) / 10,
          recommendation: `Suggested resolution approach for ${category} conflicts`,
        }),
      },
    });
  }
  console.log("Conflict analyses created");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
