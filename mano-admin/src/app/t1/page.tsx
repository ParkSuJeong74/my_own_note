import { syncT1Action } from "@/app/t1/actions";
import { listT1Matches, type T1Match } from "@/lib/t1-repository";

export const dynamic = "force-dynamic";
const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
const status = { UPCOMING: "예정", LIVE: "LIVE", FINISHED: "종료" } as const;
const resultClass = (match: T1Match) =>
  match.status !== "FINISHED"
    ? ""
    : match.t1Score > match.opponentScore
      ? "result-win"
      : match.t1Score < match.opponentScore
        ? "result-loss"
        : "result-draw";
const resultLabel = (match: T1Match) =>
  match.status !== "FINISHED"
    ? status[match.status]
    : match.t1Score > match.opponentScore
      ? "T1 승리"
      : match.t1Score < match.opponentScore
        ? "T1 패배"
        : "무승부";
const tags = (values: string[], empty = "미입력") =>
  values.length ? (
    <div className="draft-tags">
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  ) : (
    <small>{empty}</small>
  );

export default async function T1Page() {
  const matches = await listT1Matches(),
    now = Date.now(),
    upcoming = [...matches]
      .filter(
        (item) =>
          item.status !== "FINISHED" &&
          new Date(item.scheduledAt).getTime() >= now - 21600000,
      )
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    finished = matches.filter((item) => item.status === "FINISHED"),
    wins = finished.filter((item) => item.t1Score > item.opponentScore).length;
  return (
    <>
      <header className="page-head t1-head">
        <div>
          <p className="eyebrow">T1 SUPPORTERS</p>
          <h1>T1 WIN</h1>
          <p>경기 일정, 시리즈 스코어와 세트별 밴픽을 한곳에서 확인합니다.</p>
        </div>
        <div className="t1-head-actions">
          <form action={syncT1Action}>
            <button>↻ 데이터 동기화</button>
          </form>
          <a
            className="button secondary"
            href="https://lolesports.com"
            target="_blank"
            rel="noreferrer"
          >
            LoL Esports ↗
          </a>
        </div>
      </header>
      <section className="t1-summary">
        <article>
          <span>다음 경기</span>
          <strong>
            {upcoming[0] ? `vs ${upcoming[0].opponent}` : "등록된 일정 없음"}
          </strong>
          <small>
            {upcoming[0]
              ? dateTime(upcoming[0].scheduledAt)
              : "데이터를 동기화해 주세요"}
          </small>
        </article>
        <article>
          <span>기록된 전적</span>
          <strong>
            {wins}승 {finished.length - wins}패
          </strong>
          <small>완료 처리한 {finished.length}경기 기준</small>
        </article>
        <article className="t1-cheer">
          <span>오늘도</span>
          <strong>#T1WIN</strong>
          <small>Fighting!</small>
        </article>
      </section>
      <section className="section-head">
        <div>
          <p className="eyebrow">MATCH CENTER</p>
          <h2>경기 일정 및 결과</h2>
        </div>
        <small>경기 카드를 열면 자동 수집된 밴픽을 볼 수 있어요.</small>
      </section>
      <section className="t1-matches">
        {matches.map((match) => (
          <article
            className={`t1-match ${match.status.toLowerCase()} ${resultClass(match)}`}
            key={match.id}
          >
            <div className="match-main">
              <div>
                <span className="match-status">{resultLabel(match)}</span>
                <small>
                  {match.tournament} · {dateTime(match.scheduledAt)} · BO
                  {match.bestOf}
                </small>
              </div>
              <div className="match-score">
                <strong>T1</strong>
                <b>
                  {match.t1Score} : {match.opponentScore}
                </b>
                <strong>{match.opponent}</strong>
              </div>
              <div className="match-links">
                {match.note && <small>{match.note}</small>}
                <a href={match.sourceUrl} target="_blank" rel="noreferrer">
                  경기 페이지 바로가기 ↗
                </a>
              </div>
            </div>
            {match.games.length > 0 && (
              <details className="match-detail">
                <summary>세트별 밴픽 보기</summary>
                <div className="game-list">
                  {match.games.map((game) => (
                    <article key={game.id}>
                      <header>
                        <strong>{game.gameNumber}세트</strong>
                        <span
                          className={
                            game.winner === "T1"
                              ? "won"
                              : game.winner === "OPPONENT"
                                ? "lost"
                                : "pending"
                          }
                        >
                          {game.winner
                            ? `${game.winner === "T1" ? "T1" : "상대"} 승리`
                            : "결과 미입력"}
                        </span>
                        <small>
                          {game.side
                            ? `T1 ${game.side === "BLUE" ? "블루" : "레드"} 진영`
                            : "진영 미입력"}
                        </small>
                      </header>
                      <div className="draft-row">
                        <b>T1 픽</b>
                        {tags(game.t1Picks)}
                        <b>T1 밴</b>
                        {tags(game.t1Bans)}
                      </div>
                      <div className="draft-row opponent">
                        <b>{match.opponent} 픽</b>
                        {tags(game.opponentPicks)}
                        <b>{match.opponent} 밴</b>
                        {tags(game.opponentBans)}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </article>
        ))}
      </section>
      {matches.length === 0 && (
        <div className="empty-state">
          데이터 동기화를 눌러 T1 경기 일정을 가져와 주세요.
        </div>
      )}
      <p className="t1-source-note">
        일정, 결과와 밴픽은 Leaguepedia에서 동기화하며 Mano DB에 저장합니다.
        외부 데이터가 아직 등록되지 않은 경기는 밴픽이 표시되지 않을 수
        있습니다.
      </p>
    </>
  );
}
