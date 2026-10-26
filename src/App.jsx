import { useState, useEffect } from "react";
import Planner from "./planner";
import StudentProfile from "./StudentProfile";
import DiscoverOpportunities from "./DiscoverOpportunities";
import {
  FileSearch,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import "./App.css";

const OPPORTUNITIES_KEY = "proofpath-opportunities";

export default function App() {
  const [announcement, setAnnouncement] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [savedProgress, setSavedProgress] = useState(false);

  const [activeSection, setActiveSection] = useState(() => {
    return window.location.hash === "#opportunity-discovery"
      ? "opportunity-discovery"
      : "discover";
  });
  const [profileComplete, setProfileComplete] = useState(() => {
  try {
    return Boolean(
      localStorage.getItem("proofpath-student-profile")
    );
  } catch {
    return false;
  }
});

function handleProfileComplete(profile) {
  setProfileComplete(true);
  setActiveSection("opportunity-discovery");
  window.location.hash = "opportunity-discovery";
}

  const [goalText, setGoalText] = useState("");
  const [goalQuestions, setGoalQuestions] = useState([]);
  const [goalAnswers, setGoalAnswers] = useState({});
  const [goalSummary, setGoalSummary] = useState("");
  const [goalTypes, setGoalTypes] = useState([]);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  const [studentProfile, setStudentProfile] = useState({
    degree: "",
    semester: "",
    cgpa: "",
    skills: "",
  });

  const [globalProfile, setGlobalProfile] = useState({
    nationality: "",
    countries: "",
    degree: "",
    field: "",
    education: "",
    cgpa: "",
    graduationYear: "",
    experience: "",
    languageTest: "",
    funding: "Fully funded",
  });

  const [scholarships, setScholarships] = useState([]);
  const [scholarshipLoading, setScholarshipLoading] = useState(false);
  const [scholarshipError, setScholarshipError] = useState("");

  const [opportunities, setOpportunities] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(OPPORTUNITIES_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [applicationStatus, setApplicationStatus] = useState("Saved");

  // Keep saved applications synchronized with browser storage.
  useEffect(() => {
    try {
      localStorage.setItem(
        OPPORTUNITIES_KEY,
        JSON.stringify(opportunities)
      );
    } catch {
      setError("Could not save changes in this browser.");
    }
  }, [opportunities]);

  // Create checklist tasks when an announcement is analyzed.
  useEffect(() => {
    if (!result) return;

    const newTasks = [
      ...(result.documents || []).flatMap((item) => {
        const line = typeof item === "string" ? item : item.text;
        if (!line) return [];

        const colon = line.indexOf(":");
        const value = colon >= 0 ? line.slice(colon + 1) : line;

        return value
          .split(/,| and /i)
          .map((task) => task.trim().replace(/[.]$/, ""))
          .filter(Boolean);
      }),
      "Review eligibility requirements",
      "Verify the application deadline",
      "Complete and submit the application form",
    ];

    setTasks([...new Set(newTasks)]);
  }, [result]);

  // Load saved checklist progress for the current announcement.
  useEffect(() => {
    if (!result?.title) return;

    const storageKey = `proofpath-progress:${result.title}`;

    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      setCompleted(Array.isArray(saved) ? saved : []);
      setSavedProgress(false);
    } catch {
      setCompleted([]);
      setSavedProgress(false);
    }
  }, [result?.title]);

  // Save checklist progress in this browser.
  useEffect(() => {
    if (!result?.title) return;

    const storageKey = `proofpath-progress:${result.title}`;

    try {
      localStorage.setItem(storageKey, JSON.stringify(completed));
      setSavedProgress(true);
    } catch {
      setSavedProgress(false);
    }
  }, [completed, result?.title]);

  function navigate(section, hash) {
    setActiveSection(section);
    window.location.hash = hash;
  }
  function analyzeSelectedOpportunity(opportunity) {
  const title = opportunity.title || "Untitled opportunity";
  const description =
    opportunity.description || opportunity.summary || "";

  const source = opportunity.source
    ? `Source: ${opportunity.source}`
    : "";

  const url =
    opportunity.applicationLink || opportunity.url || "";

  const announcementText = [
    title,
    description,
    source,
    url ? `Application link: ${url}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  setAnnouncement(announcementText);
  setResult(null);
  setError("");
  setActiveSection("analyzer");
  window.location.hash = "announcement-analyzer";

  window.setTimeout(() => {
    document
      .getElementById("announcement-analyzer")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}
 async function analyze() {
  if (!announcement.trim()) {
    setError("Please paste an opportunity announcement first.");
    return;
  }

  setLoading(true);
  setError("");
  setResult(null);
  setTasks([]);
  setCompleted([]);
  setSavedProgress(false);

  try {
    const response = await fetch(
      "http://localhost:4000/api/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcement }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    setResult(data);
  } catch (err) {
    setError(err.message || "Could not connect to the backend.");
  } finally {
    setLoading(false);
  }
}

  async function generateGoalQuestions() {
    if (!goalText.trim()) {
      setGoalError("Please describe what you want to achieve.");
      return;
    }

    setGoalLoading(true);
    setGoalError("");
    setGoalQuestions([]);
    setGoalAnswers({});
    setGoalSummary("");
    setGoalTypes([]);
    setProfileReady(false);

    try {
      const response = await fetch(
        "http://localhost:4000/api/profile-questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ goal: goalText }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not understand your goal."
        );
      }

      if (!Array.isArray(data.questions) || !data.questions.length) {
        throw new Error(
          "The AI did not generate any questions. Please try again."
        );
      }

      setGoalSummary(data.summary || "");
      setGoalTypes(data.opportunityTypes || []);
      setGoalQuestions(data.questions);
    } catch (err) {
      setGoalError(
        err.message || "Could not connect to ProofPath AI."
      );
    } finally {
      setGoalLoading(false);
    }
  }

  function updateGoalAnswer(questionId, value) {
    setGoalAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }

  function submitGoalProfile() {
    const missing = goalQuestions.find((question) => {
      const answer = goalAnswers[question.id];

      return (
        question.required &&
        (answer === undefined ||
          answer === "" ||
          (Array.isArray(answer) && answer.length === 0))
      );
    });

    if (missing) {
      setGoalError(`Please answer: ${missing.label}`);
      return;
    }

    setGoalError("");
    setProfileReady(true);
  }

  function toggleTask(index) {
    setCompleted((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  }

  function saveOpportunity() {
    if (!result?.title) return;

    const id = `${result.title.trim().toLowerCase()}-${
      result.deadlines?.[0]?.deadlineDate || "no-date"
    }`;

    const opportunity = {
      id,
      title: result.title,
      deadline: result.deadlines?.[0]?.deadlineDate || null,
      status: applicationStatus,
      savedAt: new Date().toISOString(),
      announcement,
    };

    setOpportunities((previous) => [
      opportunity,
      ...previous.filter((item) => item.id !== id),
    ]);
  }

  function updateOpportunityStatus(id, status) {
    setOpportunities((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  }

  function removeOpportunity(id) {
    setOpportunities((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  const deadlineInfo = result?.deadlines?.[0]?.deadlineDate
    ? (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Parse the date as a local calendar date to avoid UTC shifts.
        const [year, month, day] =
          result.deadlines[0].deadlineDate.split("-").map(Number);

        const deadline = new Date(year, month - 1, day);

        if (Number.isNaN(deadline.getTime())) return null;

        const daysLeft = Math.round(
          (deadline.getTime() - now.getTime()) / 86400000
        );

        if (daysLeft < 0) {
          return {
            label: "Past deadline",
            daysLeft,
            className: "past",
          };
        }

        if (daysLeft <= 7) {
          return {
            label: "Urgent",
            daysLeft,
            className: "urgent",
          };
        }

        if (daysLeft <= 30) {
          return {
            label: "Coming soon",
            daysLeft,
            className: "soon",
          };
        }

        return {
          label: "Plenty of time",
          daysLeft,
          className: "safe",
        };
      })()
    : null;

  const cards = result
    ? [
        ["Deadlines", result.deadlines],
        ["Eligibility", result.eligibility],
        ["Required documents", result.documents],
        ["Application steps", result.steps],
      ]
    : [];
  if (!profileComplete) {
  return (
    <StudentProfile onComplete={handleProfileComplete} />
  );
}
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <a
          className="sidebar-brand"
          href="#discover"
          onClick={(event) => {
            event.preventDefault();
            navigate("discover", "discover");
          }}
        >
          <span className="sidebar-brand-icon">
            <FileSearch size={23} />
          </span>
          <span>
            ProofPath <strong>AI</strong>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a
            href="#opportunity-discovery"
            className={
              activeSection === "discover" ||
              activeSection === "opportunity-discovery"
                ? "active"
                : ""
            }
            onClick={(event) => {
              event.preventDefault();
              navigate(
                "opportunity-discovery",
                "opportunity-discovery"
              );
            }}
          >
            <Sparkles size={18} />
            Discover
          </a>

          <a
            href="#profile-panel"
            className={activeSection === "profile" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              navigate("profile", "profile-panel");
            }}
          >
            <ShieldCheck size={18} />
            My Profile
          </a>

          <a
            href="#saved-opportunities"
            className={
              activeSection === "opportunities" ? "active" : ""
            }
            onClick={(event) => {
              event.preventDefault();
              navigate("opportunities", "saved-opportunities");
            }}
          >
            <ArrowRight size={18} />
            My Opportunities
          </a>

          <a
            href="#announcement-analyzer"
            className={activeSection === "analyzer" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              navigate("analyzer", "announcement-analyzer");
            }}
          >
            <FileSearch size={18} />
            Announcement Analyzer
          </a>

          <a
            href="#application-checklist"
            className={
              activeSection === "checklist" ? "active" : ""
            }
            onClick={(event) => {
              event.preventDefault();
              navigate("checklist", "application-checklist");
            }}
          >
            <ShieldCheck size={18} />
            Application Checklist
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status-dot" />
          <span>Opportunity workspace</span>
        </div>
      </aside>

      <main className="app-shell">
        <header className="topbar">
          <a
            className="brand"
            href="#discover"
            onClick={(event) => {
              event.preventDefault();
              navigate("discover", "discover");
            }}
          >
            <span className="brand-icon">
              <FileSearch size={22} />
            </span>
            ProofPath <span className="brand-ai">AI</span>
          </a>

          <span className="top-label">
            <ShieldCheck size={15} />
            Evidence-first planning
          </span>
        </header>

        {activeSection === "opportunity-discovery" ? (
          <DiscoverOpportunities
  onAnalyzeOpportunity={analyzeSelectedOpportunity}
/>
        ) : (
          <>
            <section className="hero" id="discover">
              <div className="eyebrow">
                <Sparkles size={15} />
                YOUR NEXT OPPORTUNITY, MADE CLEAR
              </div>

              <h1>
                From opportunity
                <br />
                to <span>action plan.</span>
              </h1>

              <p className="hero-copy">
                Turn long scholarship, internship, job, and hackathon
                announcements into a clear application plan you can verify.
              </p>

              <section className="profile-panel" id="profile-panel">
                <div className="eyebrow">AI-POWERED DISCOVERY</div>
                <h2>What opportunity are you looking for?</h2>
                <p>
                  Describe your goal naturally. AI will work out which
                  details it needs to learn about you.
                </p>

                <label>
                  Describe your goal
                  <textarea
                    value={goalText}
                    onChange={(event) => setGoalText(event.target.value)}
                    placeholder="Example: I'm a CS graduate looking for remote jobs, internships, or fully funded scholarships that fit my qualifications."
                    rows={4}
                    maxLength={3000}
                  />
                </label>

                <button
                  onClick={generateGoalQuestions}
                  disabled={goalLoading}
                >
                  {goalLoading
                    ? "Understanding your goal..."
                    : "Understand my goal"}
                  {!goalLoading && <Sparkles size={17} />}
                </button>

                {goalError && (
                  <p className="error-message">{goalError}</p>
                )}

                {goalSummary && (
                  <div className="goal-summary">
                    <h3>What I understood</h3>
                    <p>{goalSummary}</p>

                    {goalTypes.length > 0 && (
                      <p>
                        <strong>Opportunity types:</strong>{" "}
                        {goalTypes.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {goalQuestions.length > 0 && (
                  <div className="dynamic-profile">
                    <h3>Let's personalize your search</h3>
                    <p>Answer the questions generated for your goal.</p>

                    {goalQuestions.map((question) => (
                      <div
                        className="dynamic-question"
                        key={question.id}
                      >
                        <label htmlFor={`goal-${question.id}`}>
                          {question.label}
                          {question.required && " *"}
                        </label>

                        {question.type === "select" ? (
                          <select
                            id={`goal-${question.id}`}
                            value={goalAnswers[question.id] || ""}
                            onChange={(event) =>
                              updateGoalAnswer(
                                question.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="">Choose an answer</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : question.type === "multiselect" ? (
                          <div className="dynamic-options">
                            {(question.options || []).map((option) => {
                              const selected = Array.isArray(
                                goalAnswers[question.id]
                              )
                                ? goalAnswers[question.id]
                                : [];

                              return (
                                <label key={option}>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={(event) => {
                                      const updated = event.target.checked
                                        ? [...selected, option]
                                        : selected.filter(
                                            (item) => item !== option
                                          );

                                      updateGoalAnswer(
                                        question.id,
                                        updated
                                      );
                                    }}
                                  />
                                  {option}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            id={`goal-${question.id}`}
                            type={
                              question.type === "number"
                                ? "number"
                                : "text"
                            }
                            value={goalAnswers[question.id] ?? ""}
                            onChange={(event) =>
                              updateGoalAnswer(
                                question.id,
                                event.target.value
                              )
                            }
                            placeholder="Your answer"
                          />
                        )}
                      </div>
                    ))}

                    <button onClick={submitGoalProfile}>
                      Save my profile answers <ArrowRight size={17} />
                    </button>

                    {profileReady && (
                      <div className="goal-summary">
                        <h3>Profile answers saved for this session</h3>
                        <p>
                          Your answers are ready for the next stage of
                          opportunity matching. Live matching against your
                          answers is not yet implemented.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <div className="workspace" id="announcement-analyzer">
                <div className="input-heading">
                  <div>
                    <span className="step-number">01</span>
                    <strong>Paste the opportunity</strong>
                  </div>
                  <span className="optional-label">Announcement text</span>
                </div>

                <textarea
                  value={announcement}
                  onChange={(event) =>
                    setAnnouncement(event.target.value)
                  }
                  placeholder={
                    "Paste an opportunity announcement here...\n\nInclude its deadline, eligibility, required documents, and application instructions."
                  }
                />

                <div className="input-footer">
                  <span>{announcement.length} characters</span>

                  <button onClick={analyze} disabled={loading}>
                    {loading ? "Analyzing..." : "Build my action plan"}
                    {!loading && <ArrowRight size={17} />}
                  </button>
                </div>

                {error && <p className="error-message">{error}</p>}
              </div>
            </section>

            {result && (
              <section className="results">
                <div className="results-heading">
                  <div>
                    <span className="eyebrow">YOUR APPLICATION BRIEF</span>
                    <h2>{result.title}</h2>
                  </div>

                  <span className="result-badge">
                    <ShieldCheck size={15} />
                    Findings to verify
                  </span>
                </div>

                {deadlineInfo && (
                  <div
                    className={`deadline-alert ${deadlineInfo.className}`}
                  >
                    <strong>{deadlineInfo.label}</strong>
                    <span>
                      {deadlineInfo.daysLeft < 0
                        ? `Deadline passed ${Math.abs(
                            deadlineInfo.daysLeft
                          )} day(s) ago`
                        : deadlineInfo.daysLeft === 0
                          ? "Deadline is today"
                          : `${deadlineInfo.daysLeft} day(s) remaining`}
                    </span>
                  </div>
                )}

                <div className="save-opportunity-panel">
                  <div>
                    <strong>Keep this opportunity</strong>
                    <p>Save it to your personal application tracker.</p>
                  </div>

                  <select
                    value={applicationStatus}
                    onChange={(event) =>
                      setApplicationStatus(event.target.value)
                    }
                  >
                    <option>Saved</option>
                    <option>In Progress</option>
                    <option>Applied</option>
                    <option>Archived</option>
                  </select>

                  <button onClick={saveOpportunity}>
                    Save opportunity
                  </button>
                </div>

                <div className="result-grid">
                  {cards.map(([title, items]) => (
                    <article className="result-card" key={title}>
                      <h3>{title}</h3>

                      {items?.length ? (
                        <ul>
                          {items.map((item, index) => {
                            const text =
                              typeof item === "string"
                                ? item
                                : item.text;

                            return (
                              <li key={`${text}-${index}`}>
                                <div>{text}</div>

                                {item.sourceLine != null && (
                                  <small className="evidence-source">
                                    <span>Source evidence</span>
                                    {" · Announcement line "}
                                    {item.sourceLine}
                                  </small>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="empty-result">
                          No matching details found. Check the original
                          announcement.
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                {result.warnings?.length > 0 && (
                  <div className="warnings">
                    <strong>Review before applying</strong>
                    {result.warnings.map((warning, index) => (
                      <p key={index}>{warning}</p>
                    ))}
                  </div>
                )}

                <div
                  className="checklist-panel"
                  id="application-checklist"
                >
                  <div className="checklist-heading">
                    <div>
                      <span className="eyebrow">YOUR NEXT MOVES</span>
                      <h2>Application checklist</h2>
                      <p>
                        Track your progress as you prepare to apply.
                      </p>
                      <p>
                        {savedProgress
                          ? "Progress saved in this browser."
                          : "Your progress will be saved in this browser."}
                      </p>
                    </div>

                    <div className="progress-number">
                      {completed.length}/{tasks.length}
                      <span> completed</span>
                    </div>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          tasks.length
                            ? (completed.length / tasks.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="task-list">
                    {tasks.map((task, index) => (
                      <label
                        className="task-row"
                        key={`${task}-${index}`}
                      >
                        <input
                          type="checkbox"
                          checked={completed.includes(index)}
                          onChange={() => toggleTask(index)}
                        />
                        <span>{task}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section
              className="saved-opportunities"
              id="saved-opportunities"
            >
              <div className="eyebrow">YOUR PERSONAL TRACKER</div>
              <h2>My opportunities</h2>
              <p>Keep track of the applications you want to pursue.</p>

              {opportunities.length > 0 ? (
                <div className="opportunity-list">
                  {opportunities.map((item) => (
                    <article
                      className="opportunity-item"
                      key={item.id}
                    >
                      <div>
                        <h3>{item.title}</h3>
                        <p>
                          Deadline: {item.deadline || "Not identified"}
                        </p>
                      </div>

                      <select
                        value={item.status || "Saved"}
                        onChange={(event) =>
                          updateOpportunityStatus(
                            item.id,
                            event.target.value
                          )
                        }
                      >
                        <option>Saved</option>
                        <option>In Progress</option>
                        <option>Applied</option>
                        <option>Archived</option>
                      </select>

                      <button
                        className="remove-opportunity"
                        onClick={() => removeOpportunity(item.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No saved opportunities yet. Analyze and save one to get started.</p>
              )}
            </section>

            <footer>
              <span>ProofPath AI</span>
              <span>Make every opportunity actionable.</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}