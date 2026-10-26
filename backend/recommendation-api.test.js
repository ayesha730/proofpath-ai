import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

process.env.NODE_ENV = "test";

const upstreamFetch = globalThis.fetch;
const item = (title, slug, description, categories = []) => `
  <item>
    <title>${title}</title>
    <link>https://fixture.example/${slug}</link>
    <description>${description}</description>
    ${categories.map(category => `<category>${category}</category>`).join("")}
    <pubDate>Mon, 26 Oct 2026 10:00:00 GMT</pubDate>
  </item>`;
const rss = items => `<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title>${items.join("")}</channel></rss>`;

const opportunityDeskFeed = rss([
  item("Fully Funded Master's Scholarship for Computer Science", "masters-scholarship", "International postgraduate scholarship in Germany. Fully funded support stated in the listing."),
  item("International Online AI Hackathon for Students", "student-ai-hackathon", "Online competition for international undergraduate software and AI students."),
  item("International Computer Science Fellowship for Undergraduate Students", "cs-fellowship", "Fellowship for undergraduate students in computer science."),
  item("Undergraduate Research Program in Artificial Intelligence", "ai-research", "Research program for undergraduate computer science students."),
  item("Global Changemakers Media Impact Academy 2026/2027", "youth-media-academy", "A youth initiative engaging young people in a 90-day program.", ["Fellowships"]),
  item("World Food Forum Youth Policy Board 2027-2028", "youth-policy-board", "An international youth-led policy program for young people.")
]);

const internshipFeed = rss([
  item("Developer Technology Engineering Intern - Compute Performance — NVIDIA", "nvidia-intern", "NVIDIA · Munich, Germany · Category: Other Tech · Type: Internship · Industry: Computer Hardware Manufacturing"),
  item("Machine Learning SW Engineering Intern — NXP Semiconductors", "nxp-intern", "NXP Semiconductors · Eindhoven, Netherlands · Category: Machine Learning · Type: Internship · Industry: Semiconductor Manufacturing"),
  item("Intern Data Science - Future Talent Program — Abbott", "abbott-intern", "Abbott · Basel, Switzerland · Category: Data Science · Type: Internship · Industry: Hospitals and Health Care"),
  item("CPU Software Intern for Verification — Arm", "arm-intern", "Arm · Sophia Antipolis, France · Category: Software Engineering · Type: Internship · Industry: Semiconductor Manufacturing"),
  item("Intern PLC developer thesis worker — Cytiva", "cytiva-intern", "Cytiva · Uppsala, Sweden · Category: Other Tech · Type: Internship · Industry: Biotechnology Research"),
  item("Junior ServiceNow Developer (Intern) — KPMG Italy", "kpmg-intern", "KPMG Italy · Milan, Italy · Category: Other Tech · Type: Internship · Industry: Business Consulting")
]);

const { app } = await import("./server.js");
let server;
let baseUrl;

before(async () => {
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    if (url === "https://opportunitydesk.org/feed/") {
      return new Response(opportunityDeskFeed, { status: 200 });
    }
    if (url === "https://scholarship-positions.com/feed/") {
      return new Response("temporarily unavailable", { status: 503 });
    }
    if (url === "https://techopportunities.eu/feed.xml") {
      return new Response(internshipFeed, { status: 200 });
    }
    return upstreamFetch(input, options);
  };

  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  globalThis.fetch = upstreamFetch;
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("/api/recommend excludes internship-heavy feeds for scholarship-focused all-relevant profile", async () => {
  const response = await upstreamFetch(`${baseUrl}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal: "7th-semester Computer Science undergraduate from Pakistan seeking a fully funded Master's abroad, international hackathons, competitions, fellowships, leadership, research, exchanges, and internships to build an international profile",
      country: "Any country",
      type: "All relevant opportunities",
      citizenship: "Pakistan",
      field: "Artificial Intelligence / Computer Science",
      level: "Final-year undergraduate / Bachelor's student",
      funding: "Fully funded preferred",
      studentProfile: {
        citizenship: "Pakistan",
        degree: "BS Computer Science",
        educationLevel: "Final-year undergraduate / Bachelor's student",
        semester: "7th",
        field: "Artificial Intelligence / Computer Science",
        goal: "Fully funded Master's abroad",
        interests: ["Scholarships", "Hackathons", "Fellowships"]
      }
    })
  });
  const data = await response.json();
  const employment = (data.opportunities || []).filter(opportunity =>
    ["Internships", "Jobs", "Employment"].includes(opportunity.category)
  );
  const returnedCategories = new Set((data.opportunities || []).map(opportunity => opportunity.category));

  assert.equal(response.status, 200);
  assert.equal(employment.length, 0);
  assert.ok(returnedCategories.has("Scholarships"));
  assert.ok(returnedCategories.has("Hackathons"));
  assert.ok(returnedCategories.has("Fellowships"));
  assert.ok(returnedCategories.has("Research Programs"));
  assert.ok(returnedCategories.has("Leadership Programs"));
  assert.ok(data.opportunities.some(opportunity => opportunity.title.includes("Media Impact Academy")));
  assert.ok(data.opportunities.some(opportunity => opportunity.title.includes("Youth Policy Board")));
  assert.equal(data.sourceStatus.find(source => source.name === "Opportunity Desk").status, "available");
  assert.equal(data.sourceStatus.find(source => source.name === "European Tech Opportunities").status, "available");
  assert.equal(data.sourceStatus.find(source => source.name === "Scholarship Positions").status, "unavailable");
});
