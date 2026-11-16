export function About() {
  return (
    <section className="card about">
      <h2>What ASTRA does</h2>
      <ul>
        <li><strong>Problem:</strong> On long space missions, astronauts are far from doctors, and body changes can build up unnoticed.</li>
        <li><strong>Solution:</strong> ASTRA helps you log health readings, spot changes over time, understand them in plain language, and know when to contact medical personnel.</li>
        <li><strong>NASA link:</strong> Built for the NASA Space Apps 2026 challenge "Create Health Monitoring Software for Astronauts on Space Missions". Explanations follow NASA human-spaceflight research areas, and Body Systems lists real NASA OSDR study records. Demo numbers are simulated.</li>
        <li><strong>Limits:</strong> A monitoring aid for early awareness. It does not diagnose or prescribe, and it cannot contact mission control.</li>
      </ul>
    </section>
  )
}

export function GuidedDemo({ steps, copied }: { steps: { label: string; detail: string; run: () => void }[]; copied: boolean }) {
  return (
    <section className="card">
      <h2>Guided demo: leg weakness</h2>
      <p className="muted">Follow the steps in order. Each Go button opens the right screen.</p>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i}><strong>{s.label}</strong> <button className="btn small" onClick={s.run}>Go</button><div className="muted">{s.detail}</div></li>
        ))}
      </ol>
      {copied && <p className="flag" role="status">Summary copied. Paste it into a message for your medical team.</p>}
    </section>
  )
}
