/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Chromeway CRM — realistic Greek sample data.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysAgo = (n: number, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
};
const daysAhead = (n: number, h = 10, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
};
const dec = (n: number) => n as never;

async function main() {
  console.log("🌱 Seeding Chromeway CRM…");

  // ─── Wipe ───
  const tables = [
    "auditLog", "notification", "comment", "activity", "calendarEvent", "payment", "invoiceItem", "invoice",
    "expense", "purchaseItem", "purchase", "materialReservation", "stockMovement", "changeOrder", "workLog",
    "projectTask", "project", "quotationItem", "quotation", "sample", "finish", "measurement", "siteVisit",
    "opportunity", "contact", "company", "serviceType", "automationSetting", "emailTemplate", "setting",
    "passwordResetToken", "file", "supplier", "material",
  ];
  for (const t of tables) {
    await (prisma as any)[t].deleteMany();
  }
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash("Chromeway2026!", 10);

  // ─── Users ───
  const [admin, sales, pm, tech, accountant, collab] = await Promise.all(
    (
      [
        ["admin@chromeway.gr", "Κώστας", "Κατσίνας", "ADMIN", "#9a5b36", "+30 6944 123456", 35],
        ["sales@chromeway.gr", "Ελένη", "Μαρκογιάννη", "SALES", "#5f7050", "+30 6932 555111", 25],
        ["pm@chromeway.gr", "Δημήτρης", "Αναστασίου", "PROJECT_MANAGER", "#5b6b7a", "+30 6977 444222", 30],
        ["tech@chromeway.gr", "Γιώργος", "Λάμπρου", "TECHNICIAN", "#b08a3e", "+30 6981 777333", 20],
        ["logistis@chromeway.gr", "Μαρία", "Κωνσταντίνου", "ACCOUNTANT", "#8a7968", "+30 210 9988776", 22],
        ["collab@chromeway.gr", "Στέλιος", "Βλάχος", "COLLABORATOR", "#a34a32", "+30 6900 112233", 18],
      ] as const
    ).map(([email, firstName, lastName, role, color, phone, hourlyRate]) =>
      prisma.user.create({ data: { email, passwordHash: pw, firstName, lastName, role: role as never, color, phone, hourlyRate: dec(hourlyRate), active: true } })
    )
  );

  // ─── Service types ───
  const serviceTypes = await Promise.all([
    ["Διακοσμητικοί σοβάδες", "Decorative plasters", "#9a5b36"],
    ["Μικροτσιμέντο & δάπεδα", "Microcement & floors", "#8a7968"],
    ["Μεταλλικά εφέ & επιχρύσωση", "Metallic effects & gilding", "#b08a3e"],
    ["Custom κατασκευές επίπλων", "Custom furniture finishes", "#5f7050"],
    ["Εφέ σκυροδέματος / βιομηχανικό", "Concrete effect / industrial", "#5b6b7a"],
  ].map(([nameEl, nameEn, color]) => prisma.serviceType.create({ data: { nameEl, nameEn, color } })));

  // ─── Settings ───
  await prisma.setting.create({
    data: {
      data: {
        companyName: "Chromeway — Studio Διακοσμητικών Φινιρισμάτων",
        companyVat: "EL801234567",
        iban: "GR16 0110 1250 0000 0001 2300 695",
        defaultVatRate: 24,
        address: "Πειραιώς 128, Αθήνα 118 54",
        phone: "+30 210 3456789",
        email: "hello@chromeway.gr",
      } as never,
    },
  });

  // ─── Companies ───
  const [hotelGrande, restaurantKyma, architectStudio, contractorAtlas, boutiqueRetail] = await Promise.all([
    prisma.company.create({ data: { name: "Grande Maris Hotels & Resorts", businessType: "HOTEL" as never, vatNumber: "EL998877665", taxOffice: "ΔΟΥ Α΄ Αθηνών", email: "projects@grandemaris.gr", phone: "+30 210 9000001", city: "Βουλιαγμένη", region: "ATTICA" as never, street: "Απολλωνός 15", tags: ["ξενοδοχειακή μονάδα", "VIP"] as never } }),
    prisma.company.create({ data: { name: "Κύμα Εστιατόρια ΑΕ", businessType: "RESTAURANT" as never, vatNumber: "EL998877664", taxOffice: "ΔΟΥ Γλυφάδας", email: "info@kyma-restaurants.gr", phone: "+30 210 9600011", city: "Γλυφάδα", region: "ATTICA" as never, tags: ["εστίαση"] as never } }),
    prisma.company.create({ data: { name: "Atelier Nomikos Architects", businessType: "ARCHITECT" as never, vatNumber: "EL997112233", taxOffice: "ΔΟΥ Β΄ Αθηνών", email: "studio@nomikos-arch.gr", phone: "+30 210 7255510", city: "Κηφισιά", region: "ATTICA" as never, website: "www.nomikos-arch.gr", tags: ["αρχιτέκτονας", "συνεργάτης"] as never } }),
    prisma.company.create({ data: { name: "Atlas Constructions IKE", businessType: "CONTRACTOR" as never, vatNumber: "EL994556677", taxOffice: "ΔΟΥ Πειραιά", email: "tenders@atlas-constr.gr", phone: "+30 210 4200033", city: "Πειραιάς", region: "ATTICA" as never, tags: ["ανάδοχος"] as never } }),
    prisma.company.create({ data: { name: "Maison Eleni Boutique", businessType: "RETAIL_BUSINESS" as never, vatNumber: "EL993334455", taxOffice: "ΔΟΥ Καλαμάτας", email: "hello@maisoneleni.gr", phone: "+30 27210 88888", city: "Καλαμάτα", region: "PELOPONNESE" as never, tags: ["πελοπόννησος"] as never } }),
  ]);

  // ─── Contacts ───
  const contacts = await Promise.all([
    // company contacts
    prisma.contact.create({ data: { firstName: "Κατερίνα", lastName: "Ρούσσου", companyId: hotelGrande.id, position: "Director of Technical Services", email: "k.rousou@grandemaris.gr", mobile: "+30 6944 200101", businessType: "HOTEL" as never, leadSource: "REFERRAL" as never, gdprConsent: true, gdprConsentAt: daysAgo(400), marketingOptIn: true, city: "Βουλιαγμένη", region: "ATTICA" as never, tags: ["decision maker", "hotel"] as never, ownerUserId: sales.id, preferredLanguage: "el" } }),
    prisma.contact.create({ data: { firstName: "Νικόλας", lastName: "Χατζής", companyId: restaurantKyma.id, position: "Managing Partner", email: "n.hatzis@kyma-restaurants.gr", mobile: "+30 6980 300201", businessType: "RESTAURANT" as never, leadSource: "INSTAGRAM" as never, gdprConsent: true, gdprConsentAt: daysAgo(120), city: "Γλυφάδα", region: "ATTICA" as never, tags: ["restaurant"] as never, ownerUserId: sales.id } }),
    prisma.contact.create({ data: { firstName: "Άγγελος", lastName: "Νομικός", companyId: architectStudio.id, position: "Principal Architect", email: "angelos@nomikos-arch.gr", mobile: "+30 6936 400301", businessType: "ARCHITECT" as never, leadSource: "EXHIBITION" as never, gdprConsent: true, gdprConsentAt: daysAgo(600), marketingOptIn: true, city: "Κηφισιά", region: "ATTICA" as never, tags: ["architect", "repeat partner"] as never, ownerUserId: admin.id, preferredLanguage: "en" } }),
    prisma.contact.create({ data: { firstName: "Σοφία", lastName: "Διαμαντή", companyId: architectStudio.id, position: "Interior Designer", email: "sofia@nomikos-arch.gr", mobile: "+30 6936 400302", businessType: "INTERIOR_DESIGNER" as never, leadSource: "PARTNER" as never, gdprConsent: true, gdprConsentAt: daysAgo(300), city: "Κηφισιά", region: "ATTICA" as never, ownerUserId: sales.id } }),
    prisma.contact.create({ data: { firstName: "Θοδωρής", lastName: "Μαλτέζος", companyId: contractorAtlas.id, position: "Technical Director", email: "t.maltezos@atlas-constr.gr", mobile: "+30 6945 500401", businessType: "CONTRACTOR" as never, leadSource: "GOOGLE_SEARCH" as never, gdprConsent: true, gdprConsentAt: daysAgo(90), city: "Πειραιάς", region: "ATTICA" as never, ownerUserId: pm.id } }),
    prisma.contact.create({ data: { firstName: "Ελένη", lastName: "Σκαλτσά", companyId: boutiqueRetail.id, position: "Owner", email: "e.skaltsa@maisoneleni.gr", mobile: "+30 6971 600501", businessType: "RETAIL_BUSINESS" as never, leadSource: "WALK_IN" as never, gdprConsent: true, gdprConsentAt: daysAgo(45), city: "Καλαμάτα", region: "PELOPONNESE" as never, tags: ["retail", "peloponnese"] as never, ownerUserId: admin.id } }),
    // private customers
    prisma.contact.create({ data: { firstName: "Αλέξανδρος", lastName: "Μεταξάς", businessType: "PRIVATE_CUSTOMER" as never, leadSource: "REFERRAL" as never, referredBy: "Άγγελος Νομικός", email: "a.metaxas@example.gr", mobile: "+30 6944 700601", gdprConsent: true, gdprConsentAt: daysAgo(60), city: "Εκάλη", region: "ATTICA" as never, street: "Διονύσου 22", postalCode: "14578", tags: ["private", "villa"] as never, ownerUserId: sales.id } }),
    prisma.contact.create({ data: { firstName: "Μυρτώ", lastName: "Αλεβίζου", businessType: "PRIVATE_CUSTOMER" as never, leadSource: "INSTAGRAM" as never, email: "m.alevizou@example.gr", mobile: "+30 6977 800701", gdprConsent: true, gdprConsentAt: daysAgo(20), city: "Ναύπλιο", region: "PELOPONNESE" as never, tags: ["private"] as never, ownerUserId: sales.id } }),
    prisma.contact.create({ data: { firstName: "Πέτρος", lastName: "Γιαννόπουλος", businessType: "PRIVATE_CUSTOMER" as never, leadSource: "WEBSITE" as never, email: "p.giannopoulos@example.gr", phone: "+30 210 8888123", mobile: "+30 6934 900801", gdprConsent: false, city: "Παγκράτι", region: "ATTICA" as never, ownerUserId: sales.id } }),
    prisma.contact.create({ data: { firstName: "Ιωάννα", lastName: "Κριεζή", businessType: "PRIVATE_CUSTOMER" as never, leadSource: "REFERRAL" as never, referredBy: "Ελένη Σκαλτσά", email: "i.kriezi@example.gr", mobile: "+30 6983 100901", gdprConsent: true, gdprConsentAt: daysAgo(8), city: "Πύργος Ηλείας", region: "PELOPONNESE" as never, tags: ["private", "referral"] as never, ownerUserId: admin.id } }),
    prisma.contact.create({ data: { firstName: "Mark", lastName: "Whitfield", businessType: "PRIVATE_CUSTOMER" as never, leadSource: "GOOGLE_SEARCH" as never, email: "mark.whitfield@example.com", mobile: "+30 6999 200999", gdprConsent: true, gdprConsentAt: daysAgo(14), city: "Πόρτο Χέλι", region: "PELOPONNESE" as never, preferredLanguage: "en", tags: ["expat", "villa"] as never, ownerUserId: admin.id } }),
  ]);

  const [katerina, nikolas, angelos, , thodoris, eleniS, alexandros, myrto, petros, ioanna, mark] = contacts;

  // ─── Finishes catalogue ───
  const finishes = await Promise.all([
    prisma.finish.create({ data: { code: "CW-VP-01", nameEl: "Βενετσιάνικο σοβά «Stucco Veneziano»", nameEn: "Venetian plaster “Stucco Veneziano”", category: "VENETIAN_PLASTER" as never, technique: "Πολυστρωματική εφαρμογή με ανοξείδωτη σπάτουλα, γυάλισμα ανά στρώση", applicationMethod: "Σπάτουλα inox", suitableSurfaces: ["Τοιχοποιία", "Γυψοσανίδα", "Σκυρόδεμα"] as never, materialSuppliers: ["Giorgio Graesan", "Novacolor"] as never, texture: "Λεία, μαρμαρυγή", glossLevel: "SATIN" as never, materialCostPerM2: dec(14), suggestedPricePerM2: dec(58), labourHoursPerM2: 1.2, applicationLayers: 4, dryingHoursBetweenCoats: 6, instructionsEl: "1) Αστάρι βαθής διείσδυσης\n2) 3–4 στρώσεις με σπάτουλα, γυάλισμα κάθε στρώσης\n3) Προαιρετικά κερί προστασίας σε υγρά χώρια", physicalSampleLocation: "Βιτρίνα Α-1", active: true } }),
    prisma.finish.create({ data: { code: "CW-MC-02", nameEl: "Μικροτσιμέντο δαπέδου «Cemento Live»", nameEn: "Microcement floor “Cemento Live”", category: "MICROCEMENT" as never, technique: "Δίχρωμη εφαρμογή με μεταλλική σπάτουλα + 2 χέρια πολυουρεθάνης", applicationMethod: "Σπάτουλα + ρολό PU", suitableSurfaces: ["Δάπεδο", "Τοίχοι μπάνιου", "Πάγκοι"] as never, materialSuppliers: ["Topciment", "Monocouche"] as never, texture: "Ομοιογενής, ελαφρώς κοκκώδης", glossLevel: "MATTE" as never, materialCostPerM2: dec(28), suggestedPricePerM2: dec(95), labourHoursPerM2: 2, applicationLayers: 3, dryingHoursBetweenCoats: 8, instructionsEl: "Ενίσχυση με ίνα γυαλιού σε αρμούς, λείανση 220 πριν το PU.", physicalSampleLocation: "Δάπεδο showroom", active: true } }),
    prisma.finish.create({ data: { code: "CW-ME-03", nameEl: "Μεταλλικό εφέ «Oro Antico»", nameEn: "Metallic effect “Oro Antico”", category: "METALLIC_EFFECT" as never, technique: "Βάση μαύρη + χρυσή μεταλλική σκόνη με πανί + patina", applicationMethod: "Πανί microfiber + σπάτουλα", suitableSurfaces: ["Τοιχοποιία", "Έπιπλα", "Κιονόκρανα"] as never, materialSuppliers: ["Novacolor", "Ferro Italy"] as never, colorCombinations: "RAL 9005 βάση + φύλλο χρυσού 23kt ή bronze powder", glossLevel: "SEMI_GLOSS" as never, materialCostPerM2: dec(38), suggestedPricePerM2: dec(140), labourHoursPerM2: 2.5, applicationLayers: 3, dryingHoursBetweenCoats: 12, physicalSampleLocation: "Βιτρίνα Β-3", active: true } }),
    prisma.finish.create({ data: { code: "CW-CE-04", nameEl: "Εφέ σκυροδέματος «Beton Ciré»", nameEn: "Concrete effect “Beton Ciré”", category: "CONCRETE_EFFECT" as never, technique: "Σοβάς με πρόσθετα οξειδίων, σφραγίσματα με καλούπια ξυλοτύπου", applicationMethod: "Σπάτουλα + καλούπια", suitableSurfaces: ["Τοιχοποιία", "Πρόσοψη", "Οροφή"] as never, materialSuppliers: ["K Rend", "Local aggregates"] as never, texture: "Φυσικό πόρο σκυροδέματος", glossLevel: "DEEP_MATTE" as never, materialCostPerM2: dec(22), suggestedPricePerM2: dec(75), labourHoursPerM2: 1.8, physicalSampleLocation: "Τοίχος workshop", active: true } }),
    prisma.finish.create({ data: { code: "CW-WD-05", nameEl: "Εφέ ξύλου σε κόντρα «Faux Bois»", nameEn: "Wood grain effect “Faux Bois”", category: "WOOD_EFFECT" as never, technique: "Ψευδοξύλο με χτένα rubber grain + λάδια", applicationMethod: "Χτένα grain + πινέλο", suitableSurfaces: ["Έπιπλα", "Πόρτες", "Δοκάρια"] as never, materialSuppliers: ["Osmo", "Sayerlack"] as never, glossLevel: "SATIN" as never, materialCostPerM2: dec(16), suggestedPricePerM2: dec(65), labourHoursPerM2: 1.5, active: true } }),
    prisma.finish.create({ data: { code: "CW-RU-06", nameEl: "Οξείδωση σιδήρου «Rustica Ferro»", nameEn: "Iron oxidation “Rustica Ferro”", category: "RUST_OXIDATION" as never, technique: "Σιδηρόχρωμη βάση + ενεργοποιητής οξείδωσης + σταθεροποίηση", applicationMethod: "Σπάτουλα + ψεκασμός activator", suitableSurfaces: ["Τοιχοποιία", "Έπιπλα", "Διακοσμητικά πάνελ"] as never, materialSuppliers: ["Porter's Paints", "Modern Masters"] as never, glossLevel: "DEEP_MATTE" as never, materialCostPerM2: dec(26), suggestedPricePerM2: dec(88), labourHoursPerM2: 1.6, active: true } }),
    prisma.finish.create({ data: { code: "CW-GI-07", nameEl: "Επιχρύσωση με φύλλο 23κ", nameEn: "23k gold leaf gilding", category: "GILDING_METAL_LEAF" as never, technique: "Missione κόλλα + φύλλο χρυσού 23 καρατίων + agate burnishing", applicationMethod: "Πινέλο missione + αγάτη", suitableSurfaces: ["Κιονόκρανα", "Κορνίζες", "Έπιπλα"] as never, materialSuppliers: ["Manetti", "GIUSTO Manetti"] as never, glossLevel: "GLOSS" as never, materialCostPerM2: dec(180), suggestedPricePerM2: dec(520), labourHoursPerM2: 4, physicalSampleLocation: "Θήκη C-1 (κλειδωμένη)", active: true } }),
    prisma.finish.create({ data: { code: "CW-TX-08", nameEl: "Υφασματός σοβάς «Tadelakt Atlas»", nameEn: "Textured plaster “Tadelakt Atlas”", category: "TEXTURED_PLASTER" as never, technique: "Μαροκινό tadelakt με πέτρα γυαλίσματος + σαπούνι ελιάς", applicationMethod: "Πέτρα galet", suitableSurfaces: ["Μπάνια", "Χαμάμ", "Κουζίνες"] as never, materialSuppliers: ["Tadelakt Pro Marrakech"] as never, glossLevel: "SATIN" as never, materialCostPerM2: dec(32), suggestedPricePerM2: dec(110), labourHoursPerM2: 2.8, active: false, archivedAt: daysAgo(30) } }),
  ]);
  void tech;

  // ─── Opportunities (full pipeline coverage) ───
  const mkOpp = async (data: any) => prisma.opportunity.create({ data });
  const opps = {
    hotelLobby: await mkOpp({
      title: "Ξενοδοχείο Grande Maris — Λόμπι & Reception", contactId: katerina.id, companyId: hotelGrande.id,
      projectName: "Renovation Lobby Season 2027", city: "Βουλιαγμένη", region: "ATTICA" as never,
      estimatedAreaM2: 420, surfaceMaterials: ["Γυψοσανίδα", "Σκυρόδεμα"] as never, requestedFinish: "Βενετσιάνικο + μεταλλικό εφέ χρυσό",
      serviceTypeId: serviceTypes[0].id, estimatedValue: dec(48000), probability: 70, expectedDecisionDate: daysAhead(21),
      source: "REFERRAL" as never, assignedUserId: admin.id, stage: "NEGOTIATION" as never, position: 1,
      nextAction: "Τελική συνάντηση διαπραγμάτευσης με την διεύθυνση", nextActionDate: daysAhead(3),
      description: "Ανανεώσιμες επιφάνειες λόμπι 5* — venetian plaster στοίχων, metallic accents reception desk.",
      lastContactedAt: daysAgo(4),
    }),
    restaurantWalls: await mkOpp({
      title: "Κύμα Γλυφάδα — Τοιχοποιία main dining", contactId: nikolas.id, companyId: restaurantKyma.id,
      projectName: "Kyma Glyfada Dining Room", city: "Γλυφάδα", region: "ATTICA" as never,
      estimatedAreaM2: 180, surfaceMaterials: ["Τούβλο", "Σοβάς"] as never, requestedFinish: "Εφέ σκυροδέματος + oxidized panels",
      serviceTypeId: serviceTypes[4].id, estimatedValue: dec(21500), probability: 55, expectedDecisionDate: daysAhead(30),
      source: "INSTAGRAM" as never, assignedUserId: sales.id, stage: "QUOTATION_SENT" as never, position: 1,
      lastContactedAt: daysAgo(9),
    }),
    villaEkali: await mkOpp({
      title: "Βίλλα Μεταξά Εκάλη — Ολόκληρο ισόγειο", contactId: alexandros.id,
      projectName: "Villa Ekali Ground Floor", city: "Εκάλη", region: "ATTICA" as never,
      estimatedAreaM2: 260, surfaceMaterials: ["Σοβάς", "Γυψοσανίδα"] as never, requestedFinish: "Venetian plaster + tadelakt μπάνια",
      finishCategoryId: "VENETIAN_PLASTER" as never, estimatedValue: dec(32000), probability: 85,
      source: "REFERRAL" as never, assignedUserId: admin.id, stage: "SAMPLE_REQUESTED" as never, position: 1,
      nextAction: "Παράδοση 2 δειγμάτων venetian", expectedDecisionDate: daysAhead(14),
    }),
    nauplioSuite: await mkOpp({
      title: "Ξενοδοχείο Ναυπλίου — Suite bathrooms", contactId: myrto.id,
      projectName: "Nafplio Suites Bathrooms", city: "Ναύπλιο", region: "PELOPONNESE" as never,
      estimatedAreaM2: 95, surfaceMaterials: ["Τσιμεντοκονία"] as never, requestedFinish: "Tadelakt μπάνια",
      estimatedValue: dec(16500), probability: 40, source: "WEBSITE" as never, assignedUserId: sales.id,
      stage: "SITE_VISIT_PLANNED" as never, position: 1, nextAction: "Επίσκεψη μέτρησης", nextActionDate: daysAhead(2),
    }),
    portoHeli: await mkOpp({
      title: "Πόρτο Χέλι Villa Whitfield — Εξωτερικές επιφάνειες", contactId: mark.id,
      projectName: "Porto Heli Facades", city: "Πόρτο Χέλι", region: "PELOPONNESE" as never,
      estimatedAreaM2: 340, surfaceMaterials: ["Εξωτερικός σοβάς"] as never, requestedFinish: "Protective coating + beton effect",
      estimatedValue: dec(28000), probability: 60, source: "GOOGLE_SEARCH" as never, assignedUserId: admin.id,
      stage: "QUALIFIED" as never, position: 1, nextAction: "Τηλέφωνο για προγραμματισμό επίσκεψης", nextActionDate: daysAhead(1),
    }),
    boutiqueKalamata: await mkOpp({
      title: "Maison Eleni — Βιτρίνες & fitting rooms", contactId: eleniS.id, companyId: boutiqueRetail.id,
      projectName: "Maison Eleni Fit-out", city: "Καλαμάτα", region: "PELOPONNESE" as never,
      estimatedAreaM2: 120, surfaceMaterials: ["MDF", "Κόντρα"] as never, requestedFinish: "Faux bois + gold leaf logo wall",
      serviceTypeId: serviceTypes[3].id, estimatedValue: dec(14200), probability: 50, source: "WALK_IN" as never,
      assignedUserId: sales.id, stage: "QUOTATION_PREPARATION" as never, position: 1,
    }),
    pyrgosHouse: await mkOpp({
      title: "Κατοικία Κριεζή Πύργος — Σαλόνι", contactId: ioanna.id,
      projectName: "Pyrgos Living Room", city: "Πύργος Ηλείας", region: "PELOPONNESE" as never,
      estimatedAreaM2: 70, surfaceMaterials: ["Σοβάς"] as never, requestedFinish: "Venetian plaster warm white",
      estimatedValue: dec(6800), probability: 35, source: "REFERRAL" as never, assignedUserId: admin.id,
      stage: "NEW_LEAD" as never, position: 1,
    }),
    pangratiFlat: await mkOpp({
      title: "Διαμέρισμα Παγκράτι — Ανακαίνιση", contactId: petros.id,
      projectName: "Pangrati Flat", city: "Αθήνα", region: "ATTICA" as never,
      estimatedAreaM2: 85, requestedFinish: "Microcement δάπεδο κουζίνας",
      estimatedValue: dec(9200), probability: 20, source: "WEBSITE" as never, assignedUserId: sales.id,
      stage: "CONTACTED" as never, position: 1,
    }),
    atlasStairwell: await mkOpp({
      title: "Atlas Constructions — Κλιμακοστάσιο γραφείων", contactId: thodoris.id, companyId: contractorAtlas.id,
      projectName: "Atlas HQ Stairwell", city: "Πειραιάς", region: "ATTICA" as never,
      estimatedAreaM2: 150, requestedFinish: "Beton ciré", estimatedValue: dec(12500), probability: 45,
      source: "PARTNER" as never, assignedUserId: pm.id, stage: "SITE_VISIT_PLANNED" as never, position: 2,
    }),
    lostOne: await mkOpp({
      title: "Καφετέρια Χαλάνδρι — Τοίχος art", contactId: nikolas.id,
      projectName: "Chalandri Cafe Art Wall", city: "Χαλάνδρι", region: "ATTICA" as never,
      estimatedValue: dec(4500), probability: 0, source: "INSTAGRAM" as never, assignedUserId: sales.id,
      stage: "LOST" as never, lossReason: "PRICE_TOO_HIGH" as never, lossNotes: "Πήγε σε οικονομικότερη λύση με ταπετσαρία.",
      closedAt: daysAgo(40),
    }),
    wonPast: await mkOpp({
      title: "Atelier Nomikos — Showroom τοίχος εκθέσεων", contactId: angelos.id, companyId: architectStudio.id,
      projectName: "Nomikos Showroom Wall", city: "Κηφισιά", region: "ATTICA" as never,
      estimatedValue: dec(11000), probability: 100, source: "EXHIBITION" as never, assignedUserId: admin.id,
      stage: "WON" as never, closedAt: daysAgo(75), lastContactedAt: daysAgo(70),
    }),
    onHold: await mkOpp({
      title: "Διαμέρισμα Ψυχικού — Δεύτερο επίπεδο", contactId: alexandros.id,
      projectName: "Psyhiko Flat Phase 2", city: "Ψυχικό", region: "ATTICA" as never,
      estimatedValue: dec(15500), probability: 30, source: "REPEAT_CUSTOMER" as never, assignedUserId: admin.id,
      stage: "ON_HOLD" as never, position: 1, nextAction: "Επικοινωνία μετά τον Σεπτέμβριο", nextActionDate: daysAhead(60),
    }),
  };

  // ─── Site visits + measurements ───
  await prisma.siteVisit.create({
    data: {
      opportunityId: opps.hotelLobby.id, contactId: katerina.id, title: "Αποτύπωση λόμπι Grande Maris",
      scheduledAt: daysAgo(12, 11), durationMin: 120, status: "COMPLETED" as never, completedAt: daysAgo(12, 13),
      address: "Απολλωνός 15", city: "Βουλιαγμένη", purpose: "Αποτύπωση επιφανειών & έλεγχος υποστρώματος",
      accessNotes: "Είσοδος από service entrance — μόνο πρωινές ώρες λόγω επισκεπτών",
      workingConditions: "Καλή φωτεινότητα, παροχή ρεύματος 3φασικό, νερό στον όροφο",
      customerRequirements: "Ολοκλήρωση πριν την έναρξη σεζόν· αντοχή σε έντονο φως ηλίου",
      generalNotes: "Οι τοίχοι του lobby έχουν υπολείμματα παλιάς ταπετσαρίας — απαιτείται καθαρισμός και αστάρι isolation.",
      assignedUserId: pm.id,
      measurements: {
        create: [
          { areaName: "Κύριος τοίχος reception", surfaceType: "wall" as never, material: "Γυψοσανίδα", lengthM: 18, heightM: 4.2, areaM2: 75.6, condition: "Υπολείμματα κόλλας ταπετσαρίας", prepRequired: "Ξύσιμο, αστάρι isolation", notes: "Πρίζες σε ύψος 30cm — προστασία" },
          { areaName: "Τοίχοι lounge (3 πλευρές)", surfaceType: "wall" as never, material: "Σοβάς", lengthM: 42, heightM: 4.2, areaM2: 176.4, condition: "Καλή, μικρογραφές σε γωνίες", prepRequired: "Στόκος γωνιών, αστάρι" },
          { areaName: "Οροφή bar", surfaceType: "ceiling" as never, material: "Γυψοσανίδα", lengthM: 9, widthM: 6, areaM2: 54, condition: "Οκ", prepRequired: "Αστάρι" },
          { areaName: "Κίονας εισόδου", surfaceType: "column" as never, material: "Σκυρόδεμα", quantityNote: "περίμετρος 3.2m × ύψος 5.4m", areaM2: 17.3 },
        ],
      },
    },
  });

  const visit2 = await prisma.siteVisit.create({
    data: {
      opportunityId: opps.nauplioSuite.id, contactId: myrto.id, title: "Μέτρηση suites Ναυπλίου",
      scheduledAt: daysAhead(2, 11, 30), durationMin: 90, status: "SCHEDULED" as never,
      address: "Πλατεία Συντάγματος 8", city: "Ναύπλιο", purpose: "Μέτρηση μπάνιων για tadelakt",
      assignedUserId: sales.id,
      accessNotes: "Λιθόστρωτο — φορτηγό σταματά 200m μακριά",
    },
  });

  const visit3 = await prisma.siteVisit.create({
    data: {
      opportunityId: opps.atlasStairwell.id, contactId: thodoris.id, title: "Επίσκεψη γραφείων Atlas Πειραιά",
      scheduledAt: daysAhead(4, 9), durationMin: 60, status: "SCHEDULED" as never,
      city: "Πειραιάς", assignedUserId: pm.id,
    },
  });

  // ─── Samples ───
  await prisma.sample.create({ data: { finishId: finishes[0].id, opportunityId: opps.villaEkali.id, contactId: alexandros.id, status: "IN_PRODUCTION" as never, sizeLabel: "30×40 cm", productionCost: dec(35), priceCharged: dec(0), producedById: tech.id, notes: "Δύο αποχρώσεις: warm white & greige" } });
  await prisma.sample.create({ data: { finishId: finishes[2].id, opportunityId: opps.hotelLobby.id, contactId: katerina.id, status: "DELIVERED" as never, sizeLabel: "40×40 cm", productionCost: dec(60), priceCharged: dec(0), deliveryDate: daysAgo(5), feedback: "«Το χρυσό θέλουμε πιο ζεστό» — θα δούμε tone antique", producedById: tech.id } });
  await prisma.sample.create({ data: { finishId: finishes[3].id, opportunityId: opps.restaurantWalls.id, contactId: nikolas.id, status: "APPROVED" as never, sizeLabel: "50×50 cm", productionCost: dec(48), priceCharged: dec(80), deliveryDate: daysAgo(15), approvedAt: daysAgo(12), feedbackRating: 5, feedback: "Τέλειο — προχωράμε με αυτό ακριβώς." } });

  // ─── Quotations ───
  const quoteItemsHotel = [
    { type: "FINISH_APPLICATION" as const, description: "Βενετσιάνικο σοβά CW-VP-01 — τοίχοι lobby & lounge", unit: "SQM", quantity: 252, unitPrice: 58, unitCost: 14, hoursPerUnit: 1.2 },
    { type: "FINISH_APPLICATION" as const, description: "Μεταλλικό εφέ Oro Antico — reception desk & feature wall", unit: "SQM", quantity: 68, unitPrice: 140, unitCost: 38, hoursPerUnit: 2.5 },
    { type: "SURFACE_PREPARATION" as const, description: "Αφαίρεση ταπετσαρίας, αστάρι isolation, στόκος", unit: "SQM", quantity: 320, unitPrice: 7.5, unitCost: 2.5, hoursPerUnit: 0.3 },
    { type: "EQUIPMENT" as const, description: "Ικριώματα & πλατφόρμες εργασίας lobby", unit: "DAY", quantity: 12, unitPrice: 65, unitCost: 40, hoursPerUnit: 0 },
    { type: "TRAVEL_TRANSPORT" as const, description: "Μεταφορικά υλικών & ομάδας (Βουλιαγμένη)", unit: "LOT", quantity: 1, unitPrice: 380, unitCost: 260, hoursPerUnit: 0 },
  ];

  const quoteHotel = await prisma.quotation.create({
    data: {
      groupId: "grp-hotel-maris-01", version: 1, number: "CW-Q-2026-0001", status: "SENT" as never,
      contactId: katerina.id, companyId: hotelGrande.id, opportunityId: opps.hotelLobby.id,
      projectName: "Renovation Lobby Season 2027", projectAddress: "Απολλωνός 15, Βουλιαγμένη", city: "Βουλιαγμένη",
      issueDate: daysAgo(10), validUntil: daysAhead(20), durationDays: 30, warrantyMonths: 24,
      wastePct: 6, markupPct: 32, discountPct: 0, vatRate: 24,
      paymentSchedule: [
        { label: "Προκαταβολή έναρξης εργασιών", pct: 40, dueDays: 0 },
        { label: "Ποσοστό μετά τις πρώτες στρώσεις", pct: 35, dueDays: 15 },
        { label: "Ολοκλήρωση & παράδοση", pct: 25, dueDays: 30 },
      ] as never,
      termsEl: "Η τιμολόγηση περιλαμβάνει υλικά και εργασία. Η εγγύηση κάλυψης είναι 24 μήνες υπό συνθήκες κανονικής χρήσης.",
      exclusionsEl: "Δεν περιλαμβάνονται: ηλεκτρολογικές/υδραυλικές εργασίες, μεταφορά αποβλήτων από τρίτους, νυχτερινή εργασία εκτός προγράμματος.",
      notesEl: "Τα δείγματα παραμένουν διαθέσιμα στο studio για σύγκριση επί τόπου.",
      publicToken: "demo-token-hotel-lobby-2026",
      publicTokenExpiresAt: daysAhead(30),
      sentAt: daysAgo(9),
      subtotal: 0, totalNet: 0, vatAmount: 0, totalGross: 0, internalCost: 0,
      createdById: admin.id,
      items: { create: quoteItemsHotel.map((it, i) => ({ position: i, ...it })) as never },
    },
    include: { items: true },
  });

  // Compute totals for the hotel quote (mirror calc.ts)
  {
    let subtotal = 0, cost = 0;
    for (const it of quoteHotel.items) {
      subtotal += Number(it.quantity) * Number(it.unitPrice);
      cost += Number(it.quantity) * Number(it.unitCost);
    }
    const waste = Math.round(subtotal * 0.06 * 100) / 100;
    const net = Math.round((subtotal + waste) * 100) / 100;
    const gross = Math.round(net * 1.24 * 100) / 100;
    await prisma.quotation.update({
      where: { id: quoteHotel.id },
      data: { subtotal: dec(Math.round(subtotal * 100) / 100), discountAmount: dec(0), totalNet: dec(net), vatAmount: dec(Math.round((gross - net) * 100) / 100), totalGross: dec(gross), internalCost: dec(cost), internalMarginPct: Math.round(((net - cost) / net) * 1000) / 10 },
    });
  }

  // Accepted quotation → past project
  const quoteShowroom = await prisma.quotation.create({
    data: {
      groupId: "grp-nomikos-shw-01", version: 1, number: "CW-Q-2026-0002", status: "ACCEPTED" as never,
      contactId: angelos.id, companyId: architectStudio.id, opportunityId: opps.wonPast.id,
      projectName: "Nomikos Showroom Wall", city: "Κηφισιά",
      issueDate: daysAgo(90), validUntil: daysAgo(60), acceptedAt: daysAgo(82), sentAt: daysAgo(88),
      viewedAt: daysAgo(87), durationDays: 8, warrantyMonths: 24, wastePct: 5, markupPct: 35, discountPct: 0, vatRate: 24,
      paymentSchedule: [{ label: "Προκαταβολή", pct: 50, dueDays: 0 }, { label: "Παράδοση", pct: 50, dueDays: 8 }] as never,
      publicToken: "demo-token-nomikos-accepted",
      subtotal: dec(10450), discountAmount: dec(0), totalNet: dec(10972.5), vatAmount: dec(2633.4), totalGross: dec(13605.9),
      internalCost: dec(3120), internalMarginPct: 71.6,
      createdById: admin.id,
      items: {
        create: [
          { position: 0, type: "FINISH_APPLICATION" as never, description: "Βενετσιάνικο σοβά — showcase wall 6m", unit: "SQM", quantity: 130, unitPrice: dec(58), unitCost: dec(14), hoursPerUnit: 1.2 },
          { type: "SURFACE_PREPARATION" as never, description: "Προετοιμασία & αστάρι", unit: "SQM", quantity: 130, unitPrice: dec(8), unitCost: dec(3), hoursPerUnit: 0.3 },
          { type: "LABOUR" as never, description: "Εργασία προετοιμασίας χώρου & καθαρισμός", unit: "DAY", quantity: 2, unitPrice: dec(180), unitCost: dec(110), hoursPerUnit: 8 },
        ],
      },
    },
  });

  // Draft quote for restaurant
  const quoteRestaurant = await prisma.quotation.create({
    data: {
      groupId: "grp-kyma-dining-01", version: 1, number: "CW-Q-2026-0003", status: "SENT" as never,
      contactId: nikolas.id, companyId: restaurantKyma.id, opportunityId: opps.restaurantWalls.id,
      projectName: "Kyma Glyfada Dining Room", city: "Γλυφάδα",
      issueDate: daysAgo(9), validUntil: daysAhead(21), sentAt: daysAgo(9),
      durationDays: 14, warrantyMonths: 12, wastePct: 5, markupPct: 35, vatRate: 24,
      paymentSchedule: [{ label: "Προκαταβολή", pct: 40, dueDays: 0 }, { label: "Παράδοση", pct: 60, dueDays: 14 }] as never,
      publicToken: "demo-token-kyma-sent",
      subtotal: dec(16800), discountAmount: dec(0), totalNet: dec(17640), vatAmount: dec(4233.6), totalGross: dec(21873.6),
      internalCost: dec(5100), internalMarginPct: 71.1,
      createdById: sales.id,
      items: {
        create: [
          { position: 0, type: "FINISH_APPLICATION" as never, description: "Εφέ σκυροδέματος Beton Ciré — main walls", unit: "SQM", quantity: 145, unitPrice: dec(75), unitCost: dec(22), hoursPerUnit: 1.8 },
          { type: "FINISH_APPLICATION" as never, description: "Οξείδωση Rustica Ferro — 4 διακοσμητικά πάνελ", unit: "SQM", quantity: 35, unitPrice: dec(88), unitCost: dec(26), hoursPerUnit: 1.6 },
          { type: "SURFACE_PREPARATION" as never, description: "Προετοιμασία τοίχων & αστάρι", unit: "SQM", quantity: 180, unitPrice: dec(7.5), unitCost: dec(2.5), hoursPerUnit: 0.25 },
        ],
      },
    },
  });

  // ─── Project (from accepted quotation) ───
  const project = await prisma.project.create({
    data: {
      code: "CW-P-2026-001", name: "Nomikos Showroom Wall",
      quotationId: quoteShowroom.id, opportunityId: opps.wonPast.id, contactId: angelos.id, companyId: architectStudio.id,
      serviceTypeId: serviceTypes[0].id, managerUserId: pm.id, teamUserIds: [tech.id, collab.id] as never,
      status: "COMPLETED" as never, contractValue: dec(13605.9), estimatedCost: dec(3120), estimatedHours: 190,
      city: "Κηφισιά", region: "ATTICA" as never,
      scopeDescription: "Βενετσιάνικο σοβά σε showcase wall 130 m² με προετοιμασία και αστάρι.",
      startDate: daysAgo(78), plannedEndDate: daysAgo(68), actualEndDate: daysAgo(67),
      progressPct: 100, qcChecklist: [
        { item: "Έλεγχος προετοιμασίας επιφανειών", done: true },
        { item: "Έλεγχος εφαρμογής ανά στρώση", done: true },
        { item: "Τελικός έλεγχος φωτισμού & οπτικής εντύπωσης", done: true },
        { item: "Καθαρισμός & παράδοση χώρου", done: true },
        { item: "Φωτογράφιση έργου για portfolio", done: true },
      ] as never,
      qcCompletedAt: daysAgo(68), customerApproved: true, customerApprovedAt: daysAgo(67),
      feedbackRating: 5, feedbackText: "Άψογη συνεργασία και εξαιρετικό αποτέλεσμα. Θα συστήσουμε και σε άλλα projects.",
    },
  });

  // Tasks of the project
  const t1 = await prisma.projectTask.create({ data: { projectId: project.id, title: "Προετοιμασία επιφάνειας & αστάρι", status: "DONE" as never, priority: "HIGH" as never, assigneeUserId: tech.id, dueDate: daysAgo(76), completedAt: daysAgo(76), position: 1 } });
  const t2 = await prisma.projectTask.create({ data: { projectId: project.id, title: "Στρώσεις 1–3 venetian", dependsOnTaskId: t1.id, status: "DONE" as never, priority: "HIGH" as never, assigneeUserId: tech.id, dueDate: daysAgo(72), completedAt: daysAgo(72), position: 2 } });
  await prisma.projectTask.create({ data: { projectId: project.id, title: "Τελικό γυάλισμα & κερί", milestone: true, dependsOnTaskId: t2.id, status: "DONE" as never, priority: "URGENT" as never, assigneeUserId: pm.id, dueDate: daysAgo(68), completedAt: daysAgo(68), position: 3 } });
  await prisma.projectTask.create({ data: { projectId: project.id, title: "Φωτογράφιση έργου για portfolio", status: "TODO" as never, priority: "LOW" as never, assigneeUserId: sales.id, dueDate: daysAhead(6), position: 4 } });

  // Standalone tasks
  await prisma.projectTask.create({ data: { title: "Follow-up: Ξενοδοχείο Grande Maris — τελική απάντηση", priority: "URGENT" as never, assigneeUserId: admin.id, dueDate: daysAhead(1), status: "TODO" as never } });
  await prisma.projectTask.create({ data: { title: "Παραγγελία υλικών Novacolor για δείγμα Εκάλης", priority: "HIGH" as never, assigneeUserId: tech.id, dueDate: daysAhead(2), status: "IN_PROGRESS_TASK" as never } });
  await prisma.projectTask.create({ data: { title: "Ενημέρωση τιμοκαταλόγου 2027", priority: "LOW" as never, assigneeUserId: admin.id, dueDate: daysAhead(20), status: "TODO" as never } });

  // Work logs
  await prisma.workLog.create({ data: { projectId: project.id, userId: tech.id, date: daysAgo(76), hours: 7, note: "Ξύσιμο, στόκος, αστάρι isolation" } });
  await prisma.workLog.create({ data: { projectId: project.id, userId: tech.id, date: daysAgo(74), hours: 8, note: "Στρώση 1 venetian — ανατολική πλευρά" } });
  await prisma.workLog.create({ data: { projectId: project.id, userId: collab.id, date: daysAgo(73), hours: 6.5, note: "Στρώση 2 — βοήθεια στην προετοιμασία" } });
  await prisma.workLog.create({ data: { projectId: project.id, userId: tech.id, date: daysAgo(70), hours: 8, note: "Στρώση 3 + πρώτο γυάλισμα", hasIssue: true, issueNote: "Καθυστέρηση λόγω υγρασίας — παράταση στεγνώματος" } });
  await prisma.workLog.create({ data: { projectId: project.id, userId: pm.id, date: daysAgo(68), hours: 4, note: "Τελικό γυάλισμα & QC walkthrough" } });

  // Change order
  await prisma.changeOrder.create({ data: { projectId: project.id, title: "Πρόσθετη στρώση σε βόρειο τοίχο (αίτημα αρχιτέκτονα)", description: "Extra layer + polishing για πιο βαθιά γυαλάδα.", amount: dec(850), cost: dec(310), approved: true, approvedAt: daysAgo(71) } });

  // Expenses of the project
  await prisma.expense.create({ data: { projectId: project.id, category: "MATERIALS_EXPENSE" as never, description: "Giorgio Graesan — Stucco Veneziano 8 κουβάδες", vendor: "Colors & Plasters AE", amount: dec(1180), vatAmount: dec(283), date: daysAgo(79), createdById: pm.id } });
  await prisma.expense.create({ data: { projectId: project.id, category: "TOOLS" as never, description: "Σπάτουλες inox & πέτρα γυαλίσματος", vendor: "ErgoTools", amount: dec(210), vatAmount: dec(50), date: daysAgo(78) } });
  await prisma.expense.create({ data: { projectId: project.id, category: "TRANSPORT" as never, description: "Μεταφορικά Αθήνα→Κηφισιά ×3", amount: dec(180), date: daysAgo(70) } });

  // Invoices for the project
  const invProforma = await prisma.invoice.create({
    data: {
      number: "CW-PF-2026-0001", kind: "PROFORMA" as never, status: "PAID" as never,
      quotationId: quoteShowroom.id, projectId: project.id, contactId: angelos.id, companyId: architectStudio.id,
      issueDate: daysAgo(81), dueDate: daysAgo(74), subtotal: dec(6802.95), vatRate: 24, vatAmount: dec(1632.71), total: dec(8435.66), paidTotal: dec(8435.66),
      notes: "Προκαταβολή 50% βάσει προσφοράς CW-Q-2026-0002",
      items: { create: [{ position: 0, description: "Προκαταβολή 50% — Venetian showcase wall", unit: "LOT" as never, quantity: 1, unitPrice: dec(6802.95) }] },
    },
  });
  const invFinal = await prisma.invoice.create({
    data: {
      number: "CW-INV-2026-0001", kind: "FINAL" as never, status: "OVERDUE" as never,
      quotationId: quoteShowroom.id, projectId: project.id, contactId: angelos.id, companyId: architectStudio.id,
      issueDate: daysAgo(64), dueDate: daysAgo(49), subtotal: dec(6802.95), vatRate: 24, vatAmount: dec(1632.71), total: dec(8435.66), paidTotal: dec(4000),
      notes: "Εξόφληση υπολοίπου 50% + πρόσθετη στρώση (change order)",
      items: { create: [{ position: 0, description: "Υπόλοιπο 50% συμβολαίου + extra layer (CO-01)", unit: "LOT" as never, quantity: 1, unitPrice: dec(6802.95) }] },
    },
  });

  await prisma.payment.create({ data: { invoiceId: invProforma.id, projectId: project.id, contactId: angelos.id, amount: dec(8435.66), method: "WEB_BANKING" as never, paidAt: daysAgo(77), reference: "PIRAEUS TR-88213" } });
  await prisma.payment.create({ data: { invoiceId: invFinal.id, projectId: project.id, contactId: angelos.id, amount: dec(4000), method: "BANK_TRANSFER" as never, paidAt: daysAgo(52), reference: "ALPHA TR-11902 (μερική)" } });

  // ─── Suppliers & materials & stock ───
  const [supGraesan, supNovacolor, supTopciment] = await Promise.all([
    prisma.supplier.create({ data: { name: "Giorgio Graesan & Friends Hellas", contactName: "Δημήτρης Σταύρου", phone: "+30 210 5501234", email: "orders@graesan.gr", address: "Βιομηχανική Περιοχή, Ασπρόπυργος", vatNumber: "EL099111222", notes: "Παράδοση 3–5 ημέρες. Έκπτωση 8% άνω των 1.500€." } }),
    prisma.supplier.create({ data: { name: "Novacolor Greece", contactName: "Αννα Πετρίδου", phone: "+30 2310 477220", email: "info@novacolor.gr" } }),
    prisma.supplier.create({ data: { name: "Topciment Hellas", contactName: "Κώστας Μανώλης", phone: "+30 210 9933445", email: "sales@topciment.gr" } }),
  ]);

  const mats = await Promise.all([
    prisma.material.create({ data: { code: "MT-VP-BASE", nameEl: "Stucco Veneziano βάση λευκή", nameEn: "Stucco base white", category: "Σοβάδες", unit: "KG" as never, supplierId: supGraesan.id, lastPurchasePrice: dec(4.2), avgPurchasePrice: dec(4.1), currentStock: 240, minStock: 100 } }),
    prisma.material.create({ data: { code: "MT-PR-ISO", nameEl: "Αστάρι isolation quartz", nameEn: "Isolation quartz primer", category: "ΑΣΤΑΡΙΑ", unit: "LITER" as never, supplierId: supGraesan.id, lastPurchasePrice: dec(9.8), avgPurchasePrice: dec(9.5), currentStock: 42, minStock: 20 } }),
    prisma.material.create({ data: { code: "MT-MC-GREY", nameEl: "Μικροτσιμέντο γκρίζο two-component", nameEn: "Grey microcement 2K", category: "Μικροτσιμέντο", unit: "KG" as never, supplierId: supTopciment.id, lastPurchasePrice: dec(6.4), avgPurchasePrice: dec(6.2), currentStock: 85, minStock: 80, batchTracking: true } }),
    prisma.material.create({ data: { code: "MT-ME-GOLD", nameEl: "Μεταλλική σκόνη χρυσή", nameEn: "Gold metallic powder", category: "Μεταλλικά", unit: "KG" as never, supplierId: supNovacolor.id, lastPurchasePrice: dec(58), avgPurchasePrice: dec(56), currentStock: 6, minStock: 8 } }),
    prisma.material.create({ data: { code: "MT-RU-ACT", nameEl: "Activator οξείδωσης", nameEn: "Oxidation activator", category: "Εφέ", unit: "LITER" as never, supplierId: supNovacolor.id, lastPurchasePrice: dec(18.5), avgPurchasePrice: dec(18.5), currentStock: 12, minStock: 6 } }),
    prisma.material.create({ data: { code: "MT-PU-2K", nameEl: "Βερνίκι πολυουρεθάνης 2K mat", nameEn: "2K polyurethane matte", category: "ΒΕΡΝΙΚΙΑ", unit: "LITER" as never, supplierId: supTopciment.id, lastPurchasePrice: dec(24), avgPurchasePrice: dec(23), currentStock: 28, minStock: 15 } }),
    prisma.material.create({ data: { code: "CN-TAPE-FIB", nameEl: "Ίνα γυαλιού mesh 5×5mm", nameEn: "Fibreglass mesh 5×5mm", category: "ΑΝΑΛΩΣΙΜΑ", unit: "SQM" as never, supplierId: supTopciment.id, lastPurchasePrice: dec(1.2), avgPurchasePrice: dec(1.15), currentStock: 350, minStock: 150 } }),
  ]);

  await prisma.purchase.create({
    data: {
      supplierId: supGraesan.id, invoiceNumber: "GR-2026-4471", date: daysAgo(25), total: dec(1344),
      createdById: pm.id,
      items: {
        create: [
          { materialId: mats[0].id, quantity: 240, unitPrice: dec(4.2), batchNo: "SV-2451" },
          { materialId: mats[1].id, quantity: 42, unitPrice: dec(9.8) },
        ],
      },
    },
  });
  await prisma.stockMovement.create({ data: { materialId: mats[0].id, type: "PURCHASE_IN" as never, quantity: 240, batchNo: "SV-2451", note: "Αγορά GR-2026-4471", userId: pm.id } });
  await prisma.stockMovement.create({ data: { materialId: mats[3].id, type: "CONSUMPTION_OUT" as never, quantity: 2.4, note: "Δείγμα Oro Antico Grande Maris", userId: tech.id } });

  // Reservations
  await prisma.materialReservation.create({ data: { projectId: project.id, materialId: mats[1].id, quantity: 20, status: "CONSUMED" as never } });

  // ─── General expenses ───
  await prisma.expense.create({ data: { category: "OFFICE_OTHER" as never, description: "Ενοίκιο εργαστηρίου Πειραιά", amount: dec(950), date: daysAgo(20), paid: true, createdById: admin.id } });
  await prisma.expense.create({ data: { category: "INSURANCE" as never, description: "Ασφάλιση εργατοτεχνιτών τριμήνου", vendor: "Interamerican", amount: dec(420), date: daysAgo(35) } });
  await prisma.expense.create({ data: { category: "EQUIPMENT_RENTAL" as never, description: "Ενοικίαση ικριωμάτων — έργο Κηφισιά", amount: dec(160), date: daysAgo(74), projectId: project.id } });

  // ─── Calendar events ───
  await prisma.calendarEvent.create({ data: { title: "Επίσκεψη μέτρησης suites Ναυπλίου", type: "SITE_VISIT_EVENT" as never, start: daysAhead(2, 11, 30), end: daysAhead(2, 13), assignedUserId: sales.id, contactId: myrto.id, visitId: visit2.id, location: "Ναύπλιο", reminderMinBefore: 120 } });
  await prisma.calendarEvent.create({ data: { title: "Επίσκεψη Atlas Πειραιά — κλιμακοστάσιο", type: "SITE_VISIT_EVENT" as never, start: daysAhead(4, 9), end: daysAhead(4, 10), assignedUserId: pm.id, visitId: visit3.id, contactId: thodoris.id } });
  await prisma.calendarEvent.create({ data: { title: "Παραγωγή δειγμάτων Εκάλης (venetian ×2)", type: "SAMPLE_PRODUCTION" as never, start: daysAhead(1, 9), end: daysAhead(1, 15), assignedUserId: tech.id } });
  await prisma.calendarEvent.create({ data: { title: "Τελική συνάντηση διαπραγμάτευσης Grande Maris", type: "CUSTOMER_MEETING" as never, start: daysAhead(3, 12), end: daysAhead(3, 13, 30), assignedUserId: admin.id, contactId: katerina.id, location: "Γραφεία Grande Maris" } });
  await prisma.calendarEvent.create({ data: { title: "Εργασίες — προετοιμασία Kyma Γλυφάδας (αναμενόμενη)", type: "PROJECT_WORK" as never, start: daysAhead(17, 8), end: daysAhead(17, 16), recurrence: "WEEKLY" as never, recurrenceInterval: 1, recurrenceUntil: daysAhead(60) as never, assignedUserId: tech.id } });
  await prisma.calendarEvent.create({ data: { title: "Λήξη πληρωμής CW-INV-2026-0001", type: "PAYMENT_DEADLINE" as never, start: daysAhead(5, 9), allDay: true, assignedUserId: accountant.id, invoiceId: invFinal.id } });
  await prisma.calendarEvent.create({ data: { title: "Εσωτερικό — weekly review pipeline", type: "INTERNAL_MEETING" as never, start: daysAhead(6, 17), end: daysAhead(6, 18), recurrence: "WEEKLY" as never, recurrenceUntil: daysAhead(90) as never } });

  // ─── Activities timeline ───
  await prisma.activity.create({ data: { kind: "CALL" as never, direction: "out", subject: "Πρώτη επικοινωνία μετά από φόρμα ιστοσελίδας", body: "Ενδιαφέρον για tadelakt σε δύο μπάνια suite. Ραντεβού για μέτρηση.", occurredAt: daysAgo(18), contactId: myrto.id, opportunityId: opps.nauplioSuite.id, userId: sales.id, durationMin: 12 } });
  await prisma.activity.create({ data: { kind: "EMAIL" as never, direction: "out", subject: "Αποστολή προσφοράς CW-Q-2026-0001", body: "Επισυνάπτουμε την προσφορά για την ανανέωση του lobby.", occurredAt: daysAgo(9), contactId: katerina.id, opportunityId: opps.hotelLobby.id, quotationId: quoteHotel.id, userId: admin.id } });
  await prisma.activity.create({ data: { kind: "MEETING_LOG" as never, subject: "Επίσκεψη αποτύπωσης λόμπι", occurredAt: daysAgo(12), contactId: katerina.id, opportunityId: opps.hotelLobby.id, userId: pm.id, durationMin: 120 } });
  await prisma.activity.create({ data: { kind: "NOTE" as never, subject: "Feedback δείγματος Oro Antico", body: "Ζητούν θερμότερο χρυσό — δοκιμή με patina antique.", occurredAt: daysAgo(4), contactId: katerina.id, userId: admin.id } });
  await prisma.activity.create({ data: { kind: "CALL" as never, direction: "in", subject: "Επιβεβαίωση παραλαβής δείγματος beton", occurredAt: daysAgo(13), contactId: nikolas.id, userId: sales.id, durationMin: 5 } });
  await prisma.activity.create({ data: { kind: "EMAIL" as never, direction: "in", subject: "RE: Αποστολή προσφοράς — ενδιαφέρον, θα επανέλθουμε", occurredAt: daysAgo(6), contactId: nikolas.id, quotationId: quoteRestaurant.id, userId: sales.id } });

  // ─── Comments ───
  await prisma.comment.create({ data: { entityType: "opportunity", entityId: opps.hotelLobby.id, userId: pm.id, body: "Το υποστρώμα χρειάζεται isolation αστάρι — το έχω βάλει στην προσφορά. @Κώστας επιβεβαίωσε τη διαθεσιμότητα ομάδας;", mentions: ["Κώστας"] as never } });
  await prisma.comment.create({ data: { entityType: "opportunity", entityId: opps.hotelLobby.id, userId: admin.id, body: "Ναι, ο Γιώργος + ο Στέλιος είναι διαθέσιμοι από τις 10 Οκτωβρίου." } });

  // ─── Email templates ───
  await prisma.emailTemplate.create({ data: { key: "quote-followup", subjectEl: "Ακολουθία: Προσφορά {{number}} — Chromeway", bodyEl: "Αγαπητέ/ή {{name}},\n\nΣας ευχαριστούμε για το ενδιαφέρον σας. Θα θέλαμε να μάθουμε αν υπάρχει κάποια απορία σχετικά με την προσφορά {{number}} για το έργο «{{project}}».\n\nΜε εκτίμηση,\nChromeway Studio", subjectEn: "Following up: Quotation {{number}} — Chromeway", bodyEn: "Dear {{name}},\n\nWe would love to hear your thoughts on quotation {{number}} for “{{project}}”.\n\nBest regards,\nChromeway Studio", variables: ["number", "name", "project"] as never } });
  await prisma.emailTemplate.create({ data: { key: "project-feedback", subjectEl: "Η γνώμη σας μετράει — Chromeway", bodyEl: "Αγαπητέ/ή {{name}},\n\nΤο έργο «{{project}}» ολοκληρώθηκε. Θα χαρούμε να μοιραστείτε την εμπειρία σας.", subjectEn: "We'd love your feedback — Chromeway", bodyEn: "Dear {{name}},\nThe project “{{project}}” is complete. We would love to hear about your experience.", variables: ["name", "project"] as never } });

  // ─── Automations defaults ───
  const autoKeys: [string, object][] = [
    ["followUpOnLead", { daysSinceCreation: 2 }],
    ["unansweredLeads", { daysSinceLastContact: 5 }],
    ["visitReminders", { hoursBefore: 24 }],
    ["staleQuotes", { daysAfterSend: 5 }],
    ["createProjectOnAccept", {}],
    ["paymentReminders", { daysBeforeDue: 3 }],
    ["projectOverrunAlerts", { tolerancePct: 110 }],
    ["feedbackAfterCompletion", { daysAfterCompletion: 3 }],
  ];
  for (const [key, config] of autoKeys) {
    await prisma.automationSetting.create({ data: { key, enabled: true, config: config as never } });
  }

  console.log("✅ Seed complete.");
  console.log("   Logins (password: Chromeway2026!):");
  console.log("   • admin@chromeway.gr      (Administrator)");
  console.log("   • sales@chromeway.gr      (Sales)");
  console.log("   • pm@chromeway.gr         (Project Manager)");
  console.log("   • tech@chromeway.gr       (Technician)");
  console.log("   • logistis@chromeway.gr   (Accountant)");
  console.log("   • collab@chromeway.gr     (Collaborator)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
