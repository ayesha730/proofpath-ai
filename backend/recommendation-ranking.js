const CATEGORY_WEIGHTS = {
  Scholarships: 30,
  Hackathons: 24,
  Fellowships: 22,
  "Leadership Programs": 21,
  "Research Programs": 20,
  "Exchange Programs": 19,
  Grants: 16,
  Conferences: 14,
  "Startup Programs": 12,
  Internships: 6
};

const CATEGORY_ORDER = Object.keys(CATEGORY_WEIGHTS);

export function parseGoalPriorities(goal, profile = {}) {
  const interests = Array.isArray(profile.interests)
    ? profile.interests.join(" ")
    : String(profile.interests || "");
  const text = `${goal || ""} ${profile.goal || ""} ${interests}`.toLowerCase();
  const requested = new Set();

  if (/scholarship|master|postgraduate|fully funded|partially funded|study abroad/.test(text)) {
    requested.add("Scholarships");
  }
  if (/hackathon|coding competition|programming contest|software competition|ai competition|international competition/.test(text)) {
    requested.add("Hackathons");
  }
  if (/fellowship/.test(text)) requested.add("Fellowships");
  if (/leadership|young leader/.test(text)) requested.add("Leadership Programs");
  if (/research/.test(text)) requested.add("Research Programs");
  if (/exchange/.test(text)) requested.add("Exchange Programs");
  if (/grant|funding opportunity/.test(text)) requested.add("Grants");
  if (/conference|symposium/.test(text)) requested.add("Conferences");
  if (/startup|accelerator/.test(text)) requested.add("Startup Programs");
  if (/internship|intern position|entry[- ]level|strengthen my cv|improve my cv/.test(text)) {
    requested.add("Internships");
  }

  const categories = CATEGORY_ORDER
    .filter(category => requested.has(category))
    .sort((left, right) => CATEGORY_WEIGHTS[right] - CATEGORY_WEIGHTS[left]);

  return {
    categories,
    weights: Object.fromEntries(categories.map(category => [category, CATEGORY_WEIGHTS[category]])),
    isPostgraduateGoal: /master|postgraduate|study abroad/.test(text),
    wantsFunding: /fully funded|partially funded|scholarship|funding/.test(text)
  };
}

export function categoryMatches(item, type) {
  if (type === "All relevant opportunities") return true;
  if (type === "Fellowships") {
    return item.category === "Fellowships" || item.category === "Leadership Programs";
  }
  return item.category === type;
}

export function filterByGoalCategories(items, priorities) {
  if (!priorities.categories.length) return items;
  const requested = new Set(priorities.categories);
  return items.filter(item => requested.has(item.category));
}

export function diversifyResults(items, priorities, limit = 24) {
  const order = priorities.categories.length
    ? priorities.categories
    : CATEGORY_ORDER;
  const groups = new Map(order.map(category => [
    category,
    items.filter(item => item.category === category)
      .sort((left, right) => right.matchScore - left.matchScore)
  ]));
  const selected = [];
  const selectedByCategory = new Map();
  const internshipLimit = Math.max(1, Math.floor(limit * 0.2));

  while (selected.length < limit) {
    let added = false;
    for (const category of order) {
      if (selected.length >= limit) break;
      const categoryItems = groups.get(category) || [];
      const categoryCount = selectedByCategory.get(category) || 0;
      const categoryLimit = category === "Internships" ? internshipLimit : Infinity;
      if (categoryCount >= categoryLimit || categoryCount >= categoryItems.length) continue;
      selected.push(categoryItems[categoryCount]);
      selectedByCategory.set(category, categoryCount + 1);
      added = true;
    }
    if (!added) break;
  }

  return selected;
}

export function isEmploymentListing(item) {
  if (["Internships", "Jobs", "Employment"].includes(item.category)) return true;
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  return /\b(job vacancy|job opening|employment opportunity|graduate recruitment|graduate trainee|graduate scheme|graduate job|new grad job|hiring for|now hiring|full[- ]time role|permanent role)\b/i.test(text);
}

export function excludeEmploymentForScholarshipGoals(items, type, priorities) {
  if (type !== "All relevant opportunities" || !priorities.categories.includes("Scholarships")) {
    return items;
  }
  return items.filter(item => !isEmploymentListing(item));
}
