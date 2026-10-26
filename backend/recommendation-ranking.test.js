import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryMatches,
  diversifyResults,
  excludeEmploymentForScholarshipGoals,
  filterByGoalCategories,
  parseGoalPriorities
} from "./recommendation-ranking.js";

const profileGoal = "I am a 7th-semester Computer Science undergraduate from Pakistan who wants to build an international profile, obtain a fully funded Master's degree abroad, participate in international hackathons and competitions, join fellowships and leadership programs, pursue research and exchanges, and find internships to strengthen my CV.";

const profile = {
  citizenship: "Pakistan",
  degree: "BS Computer Science",
  educationLevel: "Final-year undergraduate / Bachelor's student",
  semester: "7th",
  field: "Artificial Intelligence / Computer Science",
  interests: ["Scholarships", "Hackathons", "Fellowships"]
};

function opportunity(category, index, matchScore = 70) {
  return { id: `${category}-${index}`, category, matchScore };
}

test("profile priorities put Master's scholarships and international programs ahead of internships", () => {
  const priorities = parseGoalPriorities(profileGoal, profile);
  assert.equal(priorities.categories[0], "Scholarships");
  assert.ok(priorities.categories.includes("Hackathons"));
  assert.ok(priorities.categories.includes("Fellowships"));
  assert.ok(priorities.categories.includes("Leadership Programs"));
  assert.ok(priorities.categories.includes("Research Programs"));
  assert.ok(priorities.categories.includes("Exchange Programs"));
  assert.equal(priorities.categories.at(-1), "Internships");
  assert.equal(priorities.isPostgraduateGoal, true);
});

test("category searches exclude unrelated opportunity types", () => {
  const scholarship = opportunity("Scholarships", 1);
  const hackathon = opportunity("Hackathons", 2);
  const fellowship = opportunity("Fellowships", 3);
  const leadership = opportunity("Leadership Programs", 4);
  const research = opportunity("Research Programs", 5);
  const exchange = opportunity("Exchange Programs", 6);
  const internship = opportunity("Internships", 7);
  const jobs = opportunity("Jobs", 8);

  assert.equal(categoryMatches(scholarship, "Scholarships"), true);
  assert.equal(categoryMatches(hackathon, "Scholarships"), false);
  assert.equal(categoryMatches(hackathon, "Hackathons"), true);
  assert.equal(categoryMatches(scholarship, "Hackathons"), false);
  assert.equal(categoryMatches(fellowship, "Fellowships"), true);
  assert.equal(categoryMatches(leadership, "Fellowships"), true);
  assert.equal(categoryMatches(research, "Research Programs"), true);
  assert.equal(categoryMatches(exchange, "Exchange Programs"), true);
  assert.equal(categoryMatches(internship, "Internships"), true);
  assert.equal(categoryMatches(jobs, "Internships"), false);
});

test("goal filtering retains only the profile's requested categories", () => {
  const priorities = parseGoalPriorities(profileGoal, profile);
  const supplied = [
    opportunity("Scholarships", 1),
    opportunity("Hackathons", 2),
    opportunity("Internships", 3),
    opportunity("Jobs", 4),
    opportunity("Other Opportunities", 5)
  ];
  assert.deepEqual(
    filterByGoalCategories(supplied, priorities).map(item => item.category),
    ["Scholarships", "Hackathons", "Internships"]
  );
});

test("all-relevant results prioritize programs and cap internship share without padding", () => {
  const priorities = parseGoalPriorities(profileGoal, profile);
  const supplied = [
    ...Array.from({ length: 16 }, (_, index) => opportunity("Internships", index)),
    ...Array.from({ length: 3 }, (_, index) => opportunity("Scholarships", index, 90 - index)),
    ...Array.from({ length: 2 }, (_, index) => opportunity("Hackathons", index, 85 - index)),
    opportunity("Fellowships", 1, 80),
    opportunity("Leadership Programs", 1, 78),
    opportunity("Research Programs", 1, 76),
    opportunity("Exchange Programs", 1, 74)
  ];
  const selected = diversifyResults(supplied, priorities, 10);
  const internshipCount = selected.filter(item => item.category === "Internships").length;

  assert.equal(selected.length, 10);
  assert.equal(selected[0].category, "Scholarships");
  assert.ok(selected.some(item => item.category === "Hackathons"));
  assert.ok(selected.some(item => item.category === "Fellowships"));
  assert.ok(selected.some(item => item.category === "Research Programs"));
  assert.ok(internshipCount <= 2);
  assert.ok(selected.every(item => supplied.includes(item)));
});

test("mixed-result selection returns fewer results when only a few eligible items exist", () => {
  const priorities = parseGoalPriorities(profileGoal, profile);
  const supplied = [opportunity("Scholarships", 1), opportunity("Hackathons", 1)];
  assert.deepEqual(diversifyResults(supplied, priorities, 24), supplied);
});

test("scholarship-focused all-relevant results exclude all internships and employment after ranking", () => {
  const priorities = parseGoalPriorities(profileGoal, profile);
  const supplied = [
    ...Array.from({ length: 30 }, (_, index) => ({
      ...opportunity("Internships", index, 100),
      title: `AI software internship ${index}`
    })),
    ...Array.from({ length: 20 }, (_, index) => ({
      ...opportunity("Jobs", index, 100),
      title: `Graduate software job ${index}`
    })),
    { ...opportunity("Scholarships", 1, 92), title: "Fully funded Master's scholarship" },
    { ...opportunity("Hackathons", 1, 88), title: "International student AI hackathon" },
    { ...opportunity("Fellowships", 1, 84), title: "Graduate Research Fellowship Programme" },
    { ...opportunity("Research Programs", 1, 82), title: "International Graduate Research Program" },
    { ...opportunity("Exchange Programs", 1, 80), title: "International Student Exchange Program" }
  ];
  const ranked = diversifyResults(supplied, priorities, 24);
  const finalResults = excludeEmploymentForScholarshipGoals(
    ranked,
    "All relevant opportunities",
    priorities
  );

  assert.ok(finalResults.every(item => !["Internships", "Jobs", "Employment"].includes(item.category)));
  assert.ok(finalResults.some(item => item.category === "Scholarships"));
  assert.ok(finalResults.some(item => item.category === "Hackathons"));
  assert.ok(finalResults.some(item => item.category === "Fellowships"));
  assert.ok(finalResults.some(item => item.category === "Research Programs"));
  assert.ok(finalResults.some(item => item.category === "Exchange Programs"));
  assert.ok(finalResults.some(item => item.title.includes("Graduate Research")));
  assert.ok(finalResults.every(item => supplied.includes(item)));
});

test("employment exclusion does not alter explicit internship searches", () => {
  const priorities = parseGoalPriorities("Computer Science internship", profile);
  const internships = [{
    ...opportunity("Internships", 1),
    title: "AI research internship"
  }];
  assert.deepEqual(
    excludeEmploymentForScholarshipGoals(internships, "Internships", priorities),
    internships
  );
});
