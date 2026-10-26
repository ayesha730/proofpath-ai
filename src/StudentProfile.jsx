import { useState } from "react";
import "./StudentProfile.css";
import { getNames } from "country-list";

const initialProfile = {
  name: "",
  degree: "BS Computer Science",
  educationLevel: "Final-year undergraduate / Bachelor's student",
  semester: "7th",
  gpa: "",
  citizenship: "Pakistan",
  field: "Artificial Intelligence / Computer Science",
  skills: "",
  projects: "",
  experience: "",
  achievements: "",
  interests: ["Scholarships", "Hackathons"],
  countries: ["All Countries"],
  goal: "Fully funded Master's abroad",
};

const educationLevels = [
  "High school student",
  "Undergraduate / Bachelor's student",
  "Final-year undergraduate / Bachelor's student",
  "Recent graduate",
  "Master's student",
  "Working professional"
];

function profileFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem("proofpath-student-profile") || "null");
    if (!stored || typeof stored !== "object") return initialProfile;

    const semester = String(stored.semester || initialProfile.semester);
    const degree = String(stored.degree || initialProfile.degree);
    const inferredLevel = /master/i.test(degree)
      ? "Master's student"
      : /graduate/i.test(semester)
        ? "Recent graduate"
        : /^(7th|8th)$/.test(semester)
          ? "Final-year undergraduate / Bachelor's student"
          : "Undergraduate / Bachelor's student";
    const storedLevel = educationLevels.includes(stored.educationLevel)
      ? stored.educationLevel
      : inferredLevel;

    return {
      ...initialProfile,
      ...stored,
      semester,
      degree,
      educationLevel: storedLevel,
      skills: Array.isArray(stored.skills) ? stored.skills.join(", ") : String(stored.skills || ""),
      projects: Array.isArray(stored.projects) ? stored.projects.join(", ") : String(stored.projects || ""),
      interests: Array.isArray(stored.interests) ? stored.interests : initialProfile.interests,
      countries: Array.isArray(stored.countries) ? stored.countries : initialProfile.countries
    };
  } catch {
    return initialProfile;
  }
}

const interestOptions = [
  "Scholarships",
  "Fellowships",
  "Hackathons",
  "Leadership Programs",
  "Research Opportunities",
  "Student Exchanges",
  "International Competitions",
  "Conferences",
];


const COUNTRIES = getNames().sort((a, b) =>
  a.localeCompare(b)
);

export default function StudentProfile({ onComplete }) {
  const [profile, setProfile] = useState(profileFromStorage);

  const [error, setError] = useState("");

  function update(field, value) {
    setProfile((previous) => ({ ...previous, [field]: value }));
  }

  function toggle(field, value) {
    setProfile((previous) => {
      const current = previous[field];
      let next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (field === "countries") {
        if (value === "All Countries" && next.includes(value)) {
          next = ["All Countries"];
        } else if (value !== "All Countries") {
          next = next.filter((item) => item !== "All Countries");
        }
      }

      return { ...previous, [field]: next };
    });
  }

  function submit(event) {
    event.preventDefault();

    if (!profile.semester || !profile.citizenship || !profile.interests.length) {
      setError("Please select your semester, citizenship and at least one interest.");
      return;
    }

    const completed = {
      ...profile,
      skills: String(profile.skills || "").split(",").map((s) => s.trim()).filter(Boolean),
      projects: String(profile.projects || "").split(",").map((s) => s.trim()).filter(Boolean),
    };

    localStorage.setItem("proofpath-student-profile", JSON.stringify(completed));
    setError("");
    onComplete?.(completed);
  }

  return (
    <main className="student-profile-page">
      <header className="profile-heading">
        <span className="profile-kicker">PROOFPATH AI</span>
        <h1>Your next opportunity starts here.</h1>
        <p>Build your student profile to discover opportunities that fit your goals.</p>
      </header>

      <form className="student-profile-form" onSubmit={submit}>
        <section className="profile-section">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>Academic profile</h2>
              <p>Tell us where you are in your studies.</p>
            </div>
          </div>

          <div className="profile-grid">
            <label>
              Your name
              <input value={profile.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" />
            </label>

            <label>
              Degree
              <select value={profile.degree} onChange={(e) => update("degree", e.target.value)}>
                <option>BS Computer Science</option>
                <option>BS Software Engineering</option>
                <option>BS Information Technology</option>
                <option>BS Artificial Intelligence</option>
                <option>Other Bachelor's Degree</option>
                <option>Master's Degree</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Education level
              <select value={profile.educationLevel} onChange={(e) => update("educationLevel", e.target.value)}>
                {educationLevels.map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>

            <label>
              Current semester / year
              <select value={profile.semester} onChange={(e) => update("semester", e.target.value)}>
                {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "Graduate", "Recent graduate"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label>
              GPA / CGPA (optional)
              <input value={profile.gpa} onChange={(e) => update("gpa", e.target.value)} placeholder="e.g. 3.51 / 4.00" />
            </label>

            <label>
              Citizenship
              <input required value={profile.citizenship} onChange={(e) => update("citizenship", e.target.value)} placeholder="e.g. Pakistan" />
            </label>

            <label>
              Main study interest
              <select value={profile.field} onChange={(e) => update("field", e.target.value)}>
                {["Artificial Intelligence / Computer Science", "Computer Science", "Artificial Intelligence", "Data Science", "Cybersecurity", "Software Engineering", "Business", "Engineering", "Health Sciences", "Social Sciences", "Other"].map((field) => (
                  <option key={field}>{field}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h2>Your skills and experience</h2>
              <p>Include what you have already learned or achieved.</p>
            </div>
          </div>

          <div className="profile-grid">
            <label className="full-width">
              Skills <small>Separate with commas</small>
              <textarea value={profile.skills} onChange={(e) => update("skills", e.target.value)} placeholder="Python, JavaScript, research, public speaking..." />
            </label>

            <label className="full-width">
              Projects <small>Separate with commas</small>
              <textarea value={profile.projects} onChange={(e) => update("projects", e.target.value)} placeholder="Final-year project, research project, portfolio..." />
            </label>

            <label className="full-width">
              Experience and volunteering
              <textarea value={profile.experience} onChange={(e) => update("experience", e.target.value)} placeholder="Internships, clubs, volunteering, leadership, or none yet..." />
            </label>

            <label className="full-width">
              Certificates and achievements
              <textarea value={profile.achievements} onChange={(e) => update("achievements", e.target.value)} placeholder="Certificates, previous hackathons, awards, publications..." />
            </label>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-heading">
            <span>03</span>
            <div>
              <h2>What opportunities do you want?</h2>
              <p>Select everything you are interested in.</p>
            </div>
          </div>

          <div className="choice-grid">
            {interestOptions.map((item) => (
              <label className={`choice-chip ${profile.interests.includes(item) ? "selected" : ""}`} key={item}>
                <input type="checkbox" checked={profile.interests.includes(item)} onChange={() => toggle("interests", item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <label className="goal-label">
            Your main goal
            <select value={profile.goal} onChange={(e) => update("goal", e.target.value)}>
              <option>Fully funded Master's abroad</option>
              <option>Improve my CV as an undergraduate</option>
              <option>Build an international profile</option>
              <option>Gain research experience</option>
              <option>Earn certificates and achievements</option>
              <option>Develop leadership experience</option>
            </select>
          </label>

         <label className="country-label" htmlFor="countries">
  Preferred destination
</label>

<select
  id="countries"
  name="countries"
  value={
    profile.countries.includes("All Countries")
      ? ""
      : profile.countries[0] || ""
  }
  onChange={(e) =>
    update(
      "countries",
      e.target.value ? [e.target.value] : ["All Countries"]
    )
  }
>
  <option value="">All Countries</option>

  {COUNTRIES.map((country) => (
    <option key={country} value={country}>
      {country}
    </option>
  ))}
</select>
        </section>

        {error && <p className="profile-error">{error}</p>}

        <button className="profile-submit" type="submit">
          Find my opportunities <span>→</span>
        </button>
        <p className="profile-note">Your profile is saved in this browser. You can update it anytime.</p>
      </form>
    </main>
  );
}