import { useEffect, useMemo, useState } from "react";
import "./planner.css";

const STORAGE_KEY = "proofpath-mission-planner-v1";

const starterTasks = [
  "Verify eligibility and official deadline",
  "Prepare CV or required documents",
  "Complete the application or registration",
  "Review everything and submit",
];

function getSavedState(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function Planner() {
  const saved = useMemo(() => getSavedState(), []);
  const [goal, setGoal] = useState(saved.goal || "");
  const [hours, setHours] = useState(saved.hours || 8);
  const [timezone, setTimezone] = useState(
    saved.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC"
  );
  const [opportunities, setOpportunities] = useState(
    saved.opportunities || []
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Hackathon");
  const [deadline, setDeadline] = useState(dateOffset(7));
  const [sourceUrl, setSourceUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [reminders, setReminders] = useState(
    saved.reminders !== false
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        goal,
        hours,
        timezone,
        opportunities,
        reminders,
      })
    );
  }, [goal, hours, timezone, opportunities, reminders]);

  const tasks = useMemo(() => {
    const result = [];

    for (const opportunity of opportunities) {
      const daysLeft = Math.ceil(
        (new Date(`${opportunity.deadline}T23:59:59`).getTime() -
          Date.now()) /
          86400000
      );

      const taskNames =
        daysLeft <= 3
          ? [
              "Verify requirements and deadline",
              "Finish the application or submission",
              "Final review and submit",
            ]
          : starterTasks;

      taskNames.forEach((task, index) => {
        const remaining = Math.max(daysLeft, 0);
        const daysBeforeDeadline = Math.max(
          0,
          remaining - (taskNames.length - index - 1) *
            Math.max(1, Math.floor(remaining / taskNames.length))
        );

        const due = new Date(`${opportunity.deadline}T12:00:00`);
        due.setDate(
          due.getDate() -
            (taskNames.length - index - 1) *
              Math.max(1, Math.floor(remaining / taskNames.length))
        );

        result.push({
          id: `${opportunity.id}-${index}`,
          opportunityId: opportunity.id,
          opportunity: opportunity.title,
          task,
          date: due.toISOString().slice(0, 10),
          done: Boolean(opportunity.completed?.includes(index)),
          daysLeft,
        });
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [opportunities]);

  function addOpportunity(event) {
    event.preventDefault();
    setNotice("");

    if (!title.trim()) {
      setNotice("Enter an opportunity name first.");
      return;
    }

    if (!deadline || deadline < dateOffset(0)) {
      setNotice("Choose a deadline that is today or in the future.");
      return;
    }

    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        if (!["https:", "http:"].includes(url.protocol)) {
          throw new Error("Invalid URL");
        }
      } catch {
        setNotice("Enter a valid official source URL, or leave it blank.");
        return;
      }
    }

    setOpportunities((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        type,
        deadline,
        sourceUrl: sourceUrl.trim(),
        completed: [],
      },
    ]);

    setTitle("");
    setSourceUrl("");
    setNotice("Opportunity added to your mission plan.");
  }

  function toggleTask(task) {
    setOpportunities((current) =>
      current.map((opportunity) => {
        if (opportunity.id !== task.opportunityId) return opportunity;

        const completed = opportunity.completed || [];
        const index = Number(task.id.split("-").at(-1));

        return {
          ...opportunity,
          completed: completed.includes(index)
            ? completed.filter((item) => item !== index)
            : [...completed, index],
        };
      })
    );
  }

  function downloadCalendar() {
    const events = tasks
      .filter((task) => !task.done)
      .map((task) => {
        const date = task.date.replaceAll("-", "");
        const uid = `${task.id}@proofpath.local`;

        return [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${date}`,
          `SUMMARY:${task.task} — ${task.opportunity}`,
          `DESCRIPTION:ProofPath AI preparation milestone. Verify details at the official opportunity source.`,
          "END:VEVENT",
        ].join("\r\n");
      });

    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ProofPath AI//Mission Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([calendar], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "proofpath-mission.ics";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Calendar file created. Import it into your calendar app.");
  }

  async function enableReminders() {
    if (!("Notification" in window)) {
      setNotice("Browser notifications are not supported here.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      setReminders(true);
      new Notification("ProofPath AI", {
        body: "Notifications are enabled while this app is open.",
      });
      setNotice(
        "Notifications enabled. Background reminders need a deployed notification service."
      );
    } else {
      setReminders(false);
      setNotice("Notifications were not enabled in your browser.");
    }
  }

  const completedCount = tasks.filter((task) => task.done).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  return (
    <main className="planner">
      <header className="planner-header">
        <span className="planner-eyebrow">PROOFPATH AI / YOUR NEXT MOVE</span>
        <h1>Turn your ambition into a plan.</h1>
        <p>
          Organize opportunities, plan your preparation, and keep important
          deadlines visible.
        </p>
      </header>

      <section className="planner-panel">
        <label htmlFor="mission-goal">Your long-term goal</label>
        <textarea
          id="mission-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="Example: Earn a fully funded master's scholarship abroad and join international AI hackathons."
          rows={3}
        />

        <div className="planner-grid">
          <div>
            <label htmlFor="weekly-hours">Hours available per week</label>
            <input
              id="weekly-hours"
              type="number"
              min="1"
              max="80"
              value={hours}
              onChange={(event) =>
                setHours(Math.min(80, Math.max(1, Number(event.target.value))))
              }
            />
          </div>
          <div>
            <label htmlFor="mission-timezone">Your time zone</label>
            <select
              id="mission-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {[...new Set([
                timezone,
                "Asia/Karachi",
                "UTC",
                "Europe/London",
                "America/New_York",
                "America/Los_Angeles",
              ])].map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="planner-muted">
          Your settings are saved in this browser. Weekly hours guide planning;
          they do not guarantee that a schedule is feasible.
        </p>
      </section>

      <section className="planner-panel">
        <div className="planner-section-heading">
          <div>
            <span className="planner-eyebrow">01 / COLLECT</span>
            <h2>Add an opportunity</h2>
          </div>
        </div>

        <form onSubmit={addOpportunity} className="planner-form">
          <label htmlFor="opportunity-title">Opportunity name</label>
          <input
            id="opportunity-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. International AI Hackathon"
            required
          />

          <div className="planner-grid">
            <div>
              <label htmlFor="opportunity-type">Category</label>
              <select
                id="opportunity-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option>Scholarship</option>
                <option>Internship</option>
                <option>Hackathon</option>
                <option>Fellowship</option>
                <option>Leadership program</option>
                <option>Job</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="opportunity-deadline">Application deadline</label>
              <input
                id="opportunity-deadline"
                type="date"
                min={dateOffset(0)}
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                required
              />
            </div>
          </div>

          <label htmlFor="opportunity-source">Official source URL (recommended)</label>
          <input
            id="opportunity-source"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://official-program-website.org"
          />

          <button type="submit" className="planner-primary">
            + Add to my mission
          </button>
        </form>
        {notice && <p className="planner-notice" role="status">{notice}</p>}
      </section>

      <section className="planner-panel">
        <div className="planner-section-heading">
          <div>
            <span className="planner-eyebrow">02 / EXECUTE</span>
            <h2>Your preparation roadmap</h2>
          </div>
          <button
            type="button"
            className="planner-secondary"
            onClick={downloadCalendar}
            disabled={!tasks.length}
          >
            Export calendar
          </button>
        </div>

        <div className="planner-progress">
          <div>
            <strong>{progress}%</strong>
            <span> milestones complete</span>
          </div>
          <div className="planner-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="planner-empty">
            <h3>Your next chapter starts here.</h3>
            <p>Add your first opportunity above to generate its preparation milestones.</p>
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <article className="planner-opportunity" key={opportunity.id}>
              <div className="planner-opportunity-top">
                <div>
                  <span className="planner-tag">{opportunity.type}</span>
                  <h3>{opportunity.title}</h3>
                  <p className="planner-muted">
                    Deadline: {opportunity.deadline}
                  </p>
                  {opportunity.sourceUrl && (
                    <a
                      href={opportunity.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open official source ↗
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  className="planner-remove"
                  onClick={() =>
                    setOpportunities((current) =>
                      current.filter((item) => item.id !== opportunity.id)
                    )
                  }
                  aria-label={`Remove ${opportunity.title}`}
                >
                  Remove
                </button>
              </div>

              <div className="planner-task-list">
                {tasks
                  .filter((task) => task.opportunityId === opportunity.id)
                  .map((task) => (
                    <label className="planner-task" key={task.id}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task)}
                      />
                      <span className={task.done ? "is-done" : ""}>
                        <strong>{task.task}</strong>
                        <small>Target date: {task.date}</small>
                      </span>
                    </label>
                  ))}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="planner-panel planner-reminders">
        <div>
          <span className="planner-eyebrow">03 / STAY ON TRACK</span>
          <h2>Deadline reminders</h2>
          <p className="planner-muted">
            Enable browser notifications for this session. For reliable
            reminders when the browser is closed, we will connect a scheduled
            backend service in a later step.
          </p>
        </div>
        <button
          type="button"
          className="planner-primary"
          onClick={enableReminders}
        >
          {reminders ? "Check notification access" : "Enable notifications"}
        </button>
      </section>
    </main>
  );
}