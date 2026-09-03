import { syncT1Action, syncT1GameDetailsAction } from "@/app/t1/actions";
import { getT1SyncStatus, listT1Matches, type T1Match } from "@/lib/t1-repository";
import { finishedMatchPom } from "@/lib/t1-presentation";

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
const compactNumber = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value);
const championImage = (champion: string) => {
  const normalized = champion.replace(/[^a-zA-Z0-9]/g, "");
  const key = normalized.toLowerCase() === "wukong" ? "MonkeyKing" : normalized;
  return `https://ddragon.leagueoflegends.com/cdn/16.17.1/img/champion/${key}.png`;
};
const objectiveDots = (count: number, icon: string) => (
  <span className="objective-dots" aria-label={`${count}개`}>
    {count > 0 ? Array.from({ length: count }, (_, index) => <i key={index}>{icon}</i>) : <b>—</b>}
  </span>
);
const goldDifferenceChart = (timeline: T1Match["games"][number]["goldTimeline"] = []) => {
  if (timeline.length < 2) return <div className="gold-chart-empty">이 세트를 다시 동기화하면 골드 흐름을 가져옵니다.</div>;
  const width = 600, height = 170, middle = height / 2;
  const differences = timeline.map(point => point.t1Gold - point.opponentGold);
  const max = Math.max(1000, ...differences.map(Math.abs));
  const coordinates = differences.map((difference, index) => ({
    x: index / Math.max(1, differences.length - 1) * width,
    y: middle - difference / max * (middle - 14),
  }));
  const line = coordinates.map(point => `${point.x},${point.y}`).join(" ");
  const area = `0,${middle} ${line} ${width},${middle}`;
  return <div className="gold-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="시간대별 T1 골드 차이 그래프"><defs><linearGradient id="t1-gold-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f83ff" stopOpacity=".75"/><stop offset="1" stopColor="#dc3455" stopOpacity=".38"/></linearGradient></defs><line x1="0" y1={middle} x2={width} y2={middle}/><polygon points={area} /><polyline points={line}/></svg><div className="gold-chart-axis"><span>{timeline[0].minute}분</span><span>{timeline[Math.floor(timeline.length / 2)].minute}분</span><span>{timeline.at(-1)?.minute}분</span></div></div>;
};
const hasStats = (game: T1Match["games"][number]) => Boolean(
  game.duration ||
  game.t1Stats?.gold ||
  game.opponentStats?.gold ||
  game.playerStats?.t1?.length ||
  game.playerStats?.opponent?.length,
);
const hasDraft = (game: T1Match["games"][number]) => Boolean(
  game.side ||
  game.t1Picks.length ||
  game.opponentPicks.length ||
  game.t1Bans.length ||
  game.opponentBans.length,
);

export default async function T1Page() {
  const [matches, syncStatus] = await Promise.all([listT1Matches(), getT1SyncStatus()]),
    now = Date.now(),
    syncBlockedUntil = syncStatus.nextAllowedAt && new Date(syncStatus.nextAllowedAt).getTime() > now
      ? syncStatus.nextAllowedAt
      : null,
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
      {syncBlockedUntil && <aside className="t1-sync-warning">
        <strong>상세 데이터 제공처가 잠시 요청을 제한하고 있어요.</strong>
        <span>{dateTime(syncBlockedUntil)} 이후 다시 동기화해 주세요. 지금은 일정과 세트 결과만 표시됩니다.</span>
      </aside>}
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
        {matches.map((match) => {
          const pomPlayer = finishedMatchPom(match.status, match.pomPlayer);
          return (
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
                {pomPlayer && <span className="match-pom-badge"><small>OFFICIAL POM</small><strong>★ {pomPlayer}</strong></span>}
                {match.note && <small>{match.note}</small>}
                {match.watchUrl && <a className="watch-link" href={match.watchUrl} target="_blank" rel="noreferrer">
                  ▶ 치지직에서 경기 보기 ↗
                </a>}
                <a href={match.sourceUrl} target="_blank" rel="noreferrer">
                  대회 정보 ↗
                </a>
              </div>
            </div>
            {(match.games.length > 0 || match.status !== "UPCOMING") && (
              <details className="match-detail">
                <summary>세트별 밴픽·경기 통계 보기</summary>
                <div className="game-list">
                  {match.games.length === 0 && <div className="game-data-pending">
                    <p>세트 정보가 아직 없어요. 확인할 세트만 선택해서 동기화할 수 있어요.</p>
                    <div className="game-sync-actions">
                      {Array.from({ length: Math.max(match.t1Score + match.opponentScore, match.status === "FINISHED" ? 1 : 0) }, (_, index) => index + 1).map(gameNumber => <form action={syncT1GameDetailsAction} key={gameNumber}>
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="gameNumber" value={gameNumber} />
                        <button className="secondary">↻ {gameNumber}세트 동기화</button>
                      </form>)}
                    </div>
                  </div>}
                  {match.games.map((game, gameIndex) => (
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
                        {game.side && <small>T1 {game.side === "BLUE" ? "블루" : "레드"} 진영</small>}
                        <form action={syncT1GameDetailsAction}>
                          <input type="hidden" name="matchId" value={match.id} />
                          <input type="hidden" name="gameNumber" value={game.gameNumber} />
                          <button className="secondary">↻ 이 세트 동기화</button>
                        </form>
                      </header>
                      {!hasDraft(game) && !hasStats(game) && <p className="game-data-pending compact">세트 결과가 먼저 반영됐어요. 위의 이 세트 동기화를 눌러 상세 데이터를 다시 확인할 수 있어요.</p>}
                      {hasStats(game) && (() => {
                        const allPlayers = [...game.playerStats.t1, ...game.playerStats.opponent];
                        const hasDamage = allPlayers.some(player => player.damage > 0);
                        const maxDamage = Math.max(1, ...allPlayers.map(player => player.damage));
                        const kda = (players: typeof game.playerStats.t1) => players.reduce((sum, player) => [sum[0] + player.kills, sum[1] + player.deaths, sum[2] + player.assists], [0, 0, 0]);
                        return <div className="game-stat-card">
                          <div className="broadcast-scoreboard">
                            <div className="broadcast-team t1-broadcast-team"><span className="team-mark">T1</span><strong>T1</strong><b>{game.t1Stats.kills}</b></div>
                            <div className="broadcast-result"><small>GAME TIME</small><time>{game.duration || "--:--"}</time><span className={game.winner === "T1" ? "won" : "lost"}>{game.winner === "T1" ? "WIN" : "LOSS"}</span></div>
                            <div className="broadcast-team opponent-broadcast-team"><b>{game.opponentStats.kills}</b><strong>{match.opponent}</strong><span className="team-mark">{match.opponent.slice(0, 2)}</span></div>
                          </div>
                          <div className="broadcast-body">
                            <section className="broadcast-team-stats">
                              <h4>GAME STATS</h4>
                              <div className="broadcast-stat-row"><strong>{kda(game.playerStats.t1).join("/")}</strong><span>KDA</span><strong>{kda(game.playerStats.opponent).join("/")}</strong></div>
                              <div className="broadcast-stat-row"><strong>{compactNumber(game.t1Stats.gold)}</strong><span>GOLD</span><strong>{compactNumber(game.opponentStats.gold)}</strong></div>
                              <div className="broadcast-stat-row"><strong>{game.t1Stats.towers}</strong><span>TOWERS</span><strong>{game.opponentStats.towers}</strong></div>
                              <div className="broadcast-stat-row"><span>{objectiveDots(game.t1Stats.heralds + game.t1Stats.voidGrubs, "◈")}</span><span>HERALDS</span><span>{objectiveDots(game.opponentStats.heralds + game.opponentStats.voidGrubs, "◈")}</span></div>
                              <div className="broadcast-stat-row"><span>{objectiveDots(game.t1Stats.dragons, "◆")}</span><span>DRAKES</span><span>{objectiveDots(game.opponentStats.dragons, "◆")}</span></div>
                              <div className="broadcast-stat-row"><span>{objectiveDots(game.t1Stats.barons, "✹")}</span><span>BARONS</span><span>{objectiveDots(game.opponentStats.barons, "✹")}</span></div>
                              <div className="broadcast-bans"><span>{tags(game.t1Bans, "—")}</span><b>BANS</b><span>{tags(game.opponentBans, "—")}</span></div>
                            </section>
                            <section className={`damage-board ${hasDamage ? "damage-mode" : "no-damage-mode"}`}>
                              <h4>{hasDamage ? "TOTAL DAMAGE DEALT" : "PLAYERS & KDA"}</h4>
                              <div className="damage-columns">
                                {([game.playerStats.t1, game.playerStats.opponent] as const).map((team, teamIndex) => <div className={teamIndex === 0 ? "damage-team damage-t1" : "damage-team damage-opponent"} key={teamIndex}>
                                  {team.map(player => {
                                    return <div className="damage-player" key={`${player.name}-${player.champion}`}><img className="champion-token" src={championImage(player.champion)} alt={player.champion} /><div><span><strong>{player.name}</strong><small>{player.champion} · CS {player.cs}</small></span><b>{hasDamage ? compactNumber(player.damage) : `${player.kills}/${player.deaths}/${player.assists}`}</b>{hasDamage && <i><em style={{ width: `${player.damage / maxDamage * 100}%` }} /></i>}</div></div>;
                                  })}
                                </div>)}
                              </div>
                              <h4>GOLD DIFFERENCE</h4>
                              {goldDifferenceChart(game.goldTimeline)}
                              <div className="gold-difference"><span>FINAL GOLD DIFFERENCE</span><strong className={game.t1Stats.gold >= game.opponentStats.gold ? "positive" : "negative"}>{game.t1Stats.gold >= game.opponentStats.gold ? "+" : ""}{compactNumber(game.t1Stats.gold - game.opponentStats.gold)}</strong></div>
                            </section>
                          </div>
                        </div>;
                      })()}
                      {match.status === "FINISHED" && match.t1Score > match.opponentScore && gameIndex === match.games.length - 1 && match.pomPlayer && (() => {
                        const pomGames = match.games.map(item => item.playerStats.t1.find(player => player.name.toLowerCase() === match.pomPlayer.toLowerCase())).filter((player): player is NonNullable<typeof player> => Boolean(player));
                        const totals = pomGames.reduce((sum, player) => ({ kills: sum.kills + player.kills, deaths: sum.deaths + player.deaths, assists: sum.assists + player.assists }), { kills: 0, deaths: 0, assists: 0 });
                        return <section className="match-pom-card">
                          <div className="match-pom-title"><span>PLAYER OF THE MATCH</span><small>OFFICIAL POM</small></div>
                          <div className="match-pom-player"><b>POM</b><strong>{match.pomPlayer}</strong><small>{totals.kills}/{totals.deaths}/{totals.assists} · SERIES KDA</small></div>
                          <div className="match-pom-games">{pomGames.map((player, index) => <div key={`${player.champion}-${index}`}><span>GAME {index + 1}</span><img src={championImage(player.champion)} alt={player.champion} /><strong>{player.champion}</strong><small>{player.kills}/{player.deaths}/{player.assists}</small></div>)}</div>
                        </section>;
                      })()}
                    </article>
                  ))}
                </div>
              </details>
            )}
          </article>
          );
        })}
      </section>
      {matches.length === 0 && (
        <div className="empty-state">
          데이터 동기화를 눌러 T1 경기 일정을 가져와 주세요.
        </div>
      )}
      <p className="t1-source-note">
        일정과 경기 통계는 LoL Esports 공식 데이터에서 가져오고, 밴픽은
        Leaguepedia 데이터가 제공될 때 보완하여 Mano DB에 저장합니다. 제공처에
        아직 등록되지 않은 항목은 표시되지 않을 수 있습니다.
      </p>
    </>
  );
}
