export function ReportToolNav() {
  const links = [
    ["snapshot", "Snapshot"],
    ["operating-system", "Business OS"],
    ["timeline", "Recovery"],
    ["coach", "Coach"],
    ["brain", "Business Brain"],
    ["playbooks", "Playbooks"],
    ["actions", "Action Centre"],
    ["scenarios", "Cashflow Simulator"],
    ["templates", "Templates"],
  ];

  return (
    <nav className="report-tool-nav no-print" aria-label="Business report tools">
      <div>
        <p className="eyebrow">Business rescue workspace</p>
        <strong>Move quickly between diagnosis, recovery and day-to-day business control.</strong>
      </div>
      <div className="report-tool-links">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </div>
    </nav>
  );
}
