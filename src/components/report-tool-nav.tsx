export function ReportToolNav() {
  const links = [
    ["snapshot", "Snapshot"],
    ["timeline", "Recovery"],
    ["actions", "Action Centre"],
    ["scenarios", "Scenario Planner"],
    ["templates", "Templates"],
  ];

  return (
    <nav className="report-tool-nav no-print" aria-label="Business report tools">
      <div>
        <p className="eyebrow">Business rescue workspace</p>
        <strong>Move quickly between the tools that turn your report into action.</strong>
      </div>
      <div className="report-tool-links">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </div>
    </nav>
  );
}
