export function AutomationHelp({
  steps,
  risk,
}: {
  steps: string[];
  risk: string;
}) {
  return (
    <aside className="automation-help" aria-label="이 페이지 사용법">
      <div>
        <strong>이렇게 쓰세요</strong>
        <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </div>
      <p><b>주의</b> {risk}</p>
    </aside>
  );
}
