import { useEffect, useState } from "react";
import "./DiscoverOpportunities.css";

const API = "http://localhost:4000/api";
const KEY = "proofpath-saved-opportunities-v1";
const PROFILE_KEY = "proofpath-student-profile";

const COUNTRY_REGIONS = {
  "Search globally": ["Any country"],
  Europe: ["Germany", "United Kingdom", "Sweden", "Netherlands", "France", "Italy", "Finland", "Switzerland", "Norway", "Denmark", "Ireland"],
  Americas: ["United States", "Canada"],
  "Asia Pacific": ["New Zealand", "Japan", "South Korea", "China", "Singapore", "Malaysia", "Pakistan"],
  "Middle East": ["United Arab Emirates", "Saudi Arabia", "Turkey"]
};

const TYPES = [
  "All relevant opportunities", "Scholarships", "Internships", "Hackathons", "Fellowships",
  "Leadership Programs", "Research Programs", "Exchange Programs",
  "Grants", "Conferences", "Startup Programs"
];

const EDUCATION_LEVELS = [
  "High school student",
  "Undergraduate / Bachelor's student",
  "Final-year undergraduate / Bachelor's student",
  "Recent graduate",
  "Master's student",
  "Working professional"
];

const GOALS = [
  "I want a fully funded Master's abroad",
  "I want internships or jobs to improve my CV",
  "I want hackathons, fellowships and leadership programs",
  "I want to build an international profile"
];

function savedItems() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function storedStudentProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

function normalizedEducationLevel(profile) {
  if (EDUCATION_LEVELS.includes(profile?.educationLevel)) {
    return profile.educationLevel;
  }
  if (/master/i.test(String(profile?.degree || ""))) return "Master's student";
  if (/graduate/i.test(String(profile?.semester || ""))) return "Recent graduate";
  if (/^(7th|8th)$/.test(String(profile?.semester || ""))) {
    return "Final-year undergraduate / Bachelor's student";
  }
  return "Undergraduate / Bachelor's student";
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function dateText(value) {
  if (!value) return "Deadline not confirmed";

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      ).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : String(value);
}

export default function DiscoverOpportunities({
  onAnalyzeOpportunity
}) {
  const [goal, setGoal] = useState("");
  const [country, setCountry] = useState("Any country");
  const [type, setType] = useState("All relevant opportunities");
  const [citizenship, setCitizenship] = useState(() => storedStudentProfile()?.citizenship || "Pakistan");
  const [field, setField] = useState(() => storedStudentProfile()?.field || "Computer Science / IT");
  const [level, setLevel] = useState(() => normalizedEducationLevel(storedStudentProfile()));
  const [funding, setFunding] = useState("Fully funded preferred");

  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [sourceStatus, setSourceStatus] = useState([]);
  const [saved, setSaved] = useState(savedItems);
  const [loading, setLoading] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState({});

  function currentStudentProfile() {
    return {
      ...(storedStudentProfile() || {}),
      citizenship,
      field,
      educationLevel: level
    };
  }

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // Saved opportunities remain available for this session.
    }
  }, [saved]);

  function setGoalPreset(value) {
    setGoal(value);
    setError("");
  }

  async function search(event, retryPendingSources = true) {
    event?.preventDefault();

    if (!goal.trim()) {
      setError("Describe your goal first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setItems([]);
    setProfile(null);
    setRoadmapError("");
    setDirectories([]);
    setSourceStatus([]);
    setSearched(true);

    try {
      const response = await fetch(`${API}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          goal,
          country,
          type,
          citizenship,
          field,
          level,
          funding,
          studentProfile: currentStudentProfile()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not search opportunities."
        );
      }

      const normalized = (data.opportunities || []).map(
        (item, index) => ({
          ...item,
          id: String(
            item.id ||
            item.applicationLink ||
            `${item.title}-${index}`
          ),
          title: item.title || "Untitled opportunity",
          company:
            item.company ||
            item.organization ||
            item.source ||
            "Organization not listed",
          category: item.category || item.type || "Opportunity",
          description: String(
            item.description || item.summary || ""
          ).replace(/\s+/g, " ").trim(),
          applicationLink: safeHttpUrl(item.applicationLink || item.url || item.link),
          listingUrl: safeHttpUrl(item.listingUrl || item.applicationLink || item.url || item.link),
          officialApplicationLink: safeHttpUrl(item.officialApplicationLink),
          deadline: item.deadline || null,
          location:
            item.location ||
            item.destination ||
            (item.remote ? "Remote" : "See official listing"),
          source: item.source || "External source",
          fitReason: item.fitReason || "",
          description: String(item.description || ""),
          fundingStatus: item.fundingStatus || "Not confirmed",
          eligibilityStatus: item.eligibilityStatus || "Needs verification",
          deadlineStatus: item.deadlineStatus || (item.deadline ? "Deadline requires verification" : "Deadline not confirmed"),
          educationLevel: item.educationLevel || "Not stated",
          listingType: item.listingType || "Listing",
          linkLabel: item.linkLabel || "View listing"
        })
      );

      setItems(normalized);
      setSourceStatus(Array.isArray(data.sourceStatus) ? data.sourceStatus : []);
      setDirectories(Array.isArray(data.directories) ? data.directories.map(directory => ({
        ...directory,
        url: safeHttpUrl(directory.url)
      })).filter(directory => directory.url) : []);
      setProfile(data.profile || null);
      setMessage(data.message || "");

      if (
        retryPendingSources &&
        Array.isArray(data.sourceStatus) &&
        data.sourceStatus.some(source => source.status === "checking")
      ) {
        window.setTimeout(() => search(undefined, false), 1200);
      }
    } catch (err) {
      setError(
        `${err.message || "Search failed."} Make sure the backend is running.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateRoadmap() {
    setRoadmapLoading(true);
    setRoadmapError("");
    try {
      const response = await fetch(`${API}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          country,
          type,
          citizenship,
          field,
          level,
          funding,
          studentProfile: currentStudentProfile()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate a roadmap.");
      setProfile(data.profile || null);
    } catch (err) {
      setRoadmapError(err.message || "Could not generate a roadmap.");
    } finally {
      setRoadmapLoading(false);
    }
  }

  function toggleSave(item) {
    const exists = saved.some(
      savedItem =>
        savedItem.id === item.id ||
        (
          item.applicationLink &&
          savedItem.applicationLink === item.applicationLink
        )
    );

    setSaved(previous =>
      exists
        ? previous.filter(
            savedItem =>
              savedItem.id !== item.id &&
              (
                !item.applicationLink ||
                savedItem.applicationLink !== item.applicationLink
              )
          )
        : [
            ...previous,
            {
              ...item,
              savedAt: new Date().toISOString(),
              status: "Saved"
            }
          ]
    );
  }

  return (
    <main className="discover-page">
      <header className="discover-header">
        <div className="discover-eyebrow">PROOFPATH AI</div>

        <h1>Find your next opportunity.</h1>

        <p>
          Search international scholarships, student programs, research and competitions.
        </p>
      </header>

      <section className="goal-panel">
        <form onSubmit={search}>
          <label className="goal-label" htmlFor="goal">
            Your goal
          </label>

          <textarea
            id="goal"
            value={goal}
            onChange={event => setGoal(event.target.value)}
            rows={4}
            placeholder="Example: I’m a Computer Science student from Pakistan seeking a fully funded Master’s in Germany and ways to strengthen my CV."
          />

          <div className="goal-suggestions">
            {GOALS.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setGoalPreset(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="preference-panel">
              <div className="preference-heading">
                <div>
                  <h2>Personalize your search</h2>
                  <p>Choose a destination or search worldwide, including remote and online opportunities.</p>
                </div>
                <span className="international-badge">INTERNATIONAL BY DEFAULT</span>
              </div>

              <div className="preference-grid">
                <div className="destination-field">
                  <label htmlFor="country">Destination country</label>
                  <select
                    id="country"
                    value={country}
                    onChange={event => setCountry(event.target.value)}
                  >
                    {Object.entries(COUNTRY_REGIONS).map(([region, countries]) => (
                      <optgroup key={region} label={region}>
                        {countries.map(value => <option key={value}>{value}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="type">Opportunity type</label>
                  <select
                    id="type"
                    value={type}
                    onChange={event => setType(event.target.value)}
                  >
                    {TYPES.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="citizenship">Your citizenship</label>
                  <select
                    id="citizenship"
                    value={citizenship}
                    onChange={event => setCitizenship(event.target.value)}
                  >
                    {[
                      "Pakistan", "India", "Bangladesh", "Nigeria",
                      "Kenya", "United States", "United Kingdom", "Other"
                    ].map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="field">Study / career field</label>
                  <input
                    id="field"
                    value={field}
                    onChange={event => setField(event.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>

                <div>
                  <label htmlFor="level">
                    Current education / career level
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={event => setLevel(event.target.value)}
                  >
                    {EDUCATION_LEVELS.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="funding">Funding preference</label>
                  <select
                    id="funding"
                    value={funding}
                    onChange={event => setFunding(event.target.value)}
                  >
                    {[
                      "Fully funded preferred",
                      "Partial funding is okay",
                      "Funding not required",
                      "Not applicable"
                    ].map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          <button
            className="discover-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Finding opportunities…"
              : "Find opportunities for my goal →"}
          </button>
        </form>
      </section>

      {error && (
        <div className="discover-error" role="alert">
          {error}
        </div>
      )}

      {message && <p className="discover-source-message" role="status">{message}</p>}
      {sourceStatus.length > 0 && (
        <section className="source-health" aria-label="Opportunity source health">
          <h2>Source health</h2>
          <div className="source-health-list">
            {sourceStatus.map(source => (
              <div className="source-health-item" key={source.name}>
                <span className={`source-indicator source-${source.status}`} aria-hidden="true" />
                <strong>{source.name}</strong>
                <span>{source.status === "available" ? "Live" : source.status === "stale" ? "Cached" : source.status === "checking" ? "Checking" : "Unavailable"}</span>
                <small>
                  {source.lastSuccessfulAt
                    ? `Updated ${new Date(source.lastSuccessfulAt).toLocaleString()}`
                    : "No successful update yet"}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}
      {directories.length > 0 && (
        <section className="directory-section" aria-label="Official source directories">
          <div className="directory-heading">
            <h2>Official source directories</h2>
            <p>Browse current openings directly. These are source directories, not individual live listings.</p>
          </div>
          <div className="directory-links">
            {directories.map(directory => (
              <a key={directory.name} href={directory.url} target="_blank" rel="noopener noreferrer">
                <span>{directory.category}</span>
                <strong>{directory.name}</strong>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {searched && !profile && (
        <section className="roadmap-control" aria-label="Personal roadmap">
          <button
            className="roadmap-trigger"
            type="button"
            onClick={generateRoadmap}
            disabled={roadmapLoading}
          >
            {roadmapLoading ? "Building your roadmap…" : "Build my personalized roadmap"}
          </button>
          {roadmapError && <p role="alert">{roadmapError}</p>}
        </section>
      )}
      {profile && (
  <section className="personalized-plan">
    <span className="plan-eyebrow">YOUR PERSONAL ROADMAP</span>
    <h2>Your next steps</h2>

    {profile.summary && (
      <p className="plan-summary">{profile.summary}</p>
    )}

    {Array.isArray(profile.nextSteps) &&
      profile.nextSteps.length > 0 && (
        <ol className="plan-steps">
          {profile.nextSteps.map((step, index) => (
            <li key={`${index}-${step}`}>
              <span className="step-number">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
  </section>
)}

      {searched && (
        <section className="results-section">
          <h2>Opportunities for your goal</h2>

          <p className="results-count" aria-live="polite">
            {loading
              ? "Checking connected sources…"
              : `${items.length} listing${items.length === 1 ? "" : "s"} returned · ${saved.length} saved`}
          </p>

          {loading && (
            <div className="loading-state" role="status">
              <span className="loading-indicator" aria-hidden="true" />
              <span>Checking public opportunity feeds…</span>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="opportunity-grid">
              {items.map(item => {
                const isSaved = saved.some(
                  savedItem =>
                    savedItem.id === item.id ||
                    (
                      item.applicationLink &&
                      savedItem.applicationLink === item.applicationLink
                    )
                );

                const isExpanded = Boolean(expanded[item.id]);

                return (
                  <article className="opportunity-card" key={item.id}>
                    <div className="card-topline">
                      <span className="category-tag">
                        {item.category}
                      </span>

                      <button
                        className="save-button"
                        type="button"
                        onClick={() => toggleSave(item)}
                      >
                        {isSaved ? "✓ Saved" : "+ Save"}
                      </button>
                    </div>

                    <h3>{item.title}</h3>

                    <p className="company-line">{item.company}</p>

                    <div className="opportunity-meta">
                      <span className="meta-chip location-chip">{item.location}</span>
                      <span className="meta-chip category-chip">{item.category}</span>
                      <span className="meta-chip funding-chip">{item.fundingStatus}</span>
                    </div>

                    <div className="card-detail-grid">
                      <p><strong>Education:</strong> {item.educationLevel}</p>
                      <p><strong>Deadline:</strong> {dateText(item.deadline)}</p>
                      <p><strong>Eligibility:</strong> {item.eligibilityStatus}</p>
                      <p><strong>Source:</strong> {item.source} <span className="source-kind">· {item.listingType}</span></p>
                    </div>

                    {item.fundingClaim && <p className="verification-note">{item.fundingClaim}. Verify on the organizer’s page.</p>}

                    {item.fitReason && (
                      <p className="fit-reason">
                        <strong>Why it may fit:</strong> {item.fitReason}
                      </p>
                    )}
                    <div className="match-score">
                      <span>Relevance estimate<br /><small>Not an eligibility decision</small></span>
                      <strong>{item.matchScore ?? 0}<small>/100</small></strong>
                    </div>

                    {item.eligibilityNote && <p className="eligibility-note">{item.eligibilityNote}</p>}
                    <p className="deadline-note">{item.deadlineStatus}</p>

                    <p className="opportunity-description">
                      {isExpanded
                        ? item.description
                        : `${item.description.slice(0, 220)}${item.description.length > 220 ? "…" : ""}`}
                    </p>

                    {item.description.length > 220 && (
                      <button
                        className="read-more"
                        type="button"
                        onClick={() =>
                          setExpanded(previous => ({
                            ...previous,
                            [item.id]: !previous[item.id]
                          }))
                        }
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}

                    <div className="card-actions">
                      {(item.officialApplicationLink || item.listingUrl || item.applicationLink) && (
                        <a
                          className={item.officialApplicationLink ? "official-link" : "listing-link"}
                          href={item.officialApplicationLink || item.listingUrl || item.applicationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.officialApplicationLink ? "Official application ↗" : `${item.linkLabel} ↗`}
                        </a>
                      )}

                      {onAnalyzeOpportunity && (
                        <button
                          className="planner-button"
                          type="button"
                          onClick={() => onAnalyzeOpportunity(item)}
                        >
                          Make an action plan
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && searched && items.length === 0 && !error && (
            <div className="empty-results">
              <strong>No matching individual listings are available for this search.</strong>
              <span>Live listings are temporarily limited when public feeds are unavailable. Browse the official directories above or adjust your destination and opportunity type.</span>
            </div>
          )}
        </section>
      )}

      <footer className="discover-footer">
        Confirm eligibility, funding and deadlines on the official
        organizer’s website. Results depend on connected sources and
        may not include every current opportunity.
      </footer>
    </main>
  );
}