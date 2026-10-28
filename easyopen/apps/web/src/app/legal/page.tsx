import type {Metadata} from 'next';
export const metadata:Metadata={title:'저작권·개인정보·안전 안내',description:'EasyOpen 웹사이트의 다운로드 출처, 개인정보 처리, 오픈소스 권리와 오류 신고 안내.'};
const issues='https://github.com/ParkSuJeong74/my_own_note/issues';
export default function Legal(){return <section className="shell page-section article-narrow"><span className="section-kicker">POLICY & SAFETY</span><h1 className="page-title">출처와 현재 상태를<br/>숨기지 않습니다.</h1><p className="page-desc">시행·최종 수정일: 2026년 10월 28일</p><div className="content-panel prose">
 <h2>EasyOpen과 원본 오픈소스</h2><p>EasyOpen 앱과 이 웹사이트는 MANO가 배포합니다. 소개된 프로그램의 이름·상표·소스·배포물은 각 권리자에게 귀속되며, EasyOpen 배포 파일과 원본 프로젝트 파일은 서로 다른 배포물입니다. 각 도구 페이지의 공식 출처와 라이선스를 우선 확인하세요.</p>
 <h2>다운로드 출처</h2><p>EasyOpen 베타 설치 파일은 <a href="https://github.com/ParkSuJeong74/my_own_note/releases" target="_blank" rel="noreferrer noopener">공개 GitHub Releases에서만 확인</a>합니다. 스토어·Homebrew·TestFlight는 실제 링크가 등록된 경우에만 활성화됩니다. 파일 공개는 코드 서명, 실기기 설치 또는 정식 지원 완료를 뜻하지 않습니다.</p>
 <h2>개인정보와 기술 로그</h2><p>이 웹사이트는 회원가입, 결제, 사용자 파일 업로드 기능을 제공하지 않습니다. 선택적 Cloudflare Web Analytics 토큰이 설정된 경우 쿠키 없는 방문 통계가 처리될 수 있고, 호스팅·보안 제공자인 Cloudflare가 IP 주소, 요청 시각, 접속 경로, 브라우저 정보 등의 기술 로그를 보안과 서비스 제공 목적으로 처리할 수 있습니다. EasyOpen 웹사이트는 Jellyfin 계정, 비밀번호와 미디어 파일을 받지 않습니다.</p>
 <h2>정확성과 보증</h2><p>프로그램 버전과 지원 환경은 바뀔 수 있습니다. 다운로드 성공은 설치·실행 성공을 뜻하지 않으며, 실기기 검증 전 기능은 베타 또는 검증 중으로 표시합니다.</p>
 <h2>오류·보안 문제 신고</h2><p>잘못된 링크, 지원 상태 또는 보안 문제는 <a href={issues} target="_blank" rel="noreferrer noopener">공개 GitHub Issues에서 신고</a>할 수 있습니다. 계정, 비밀번호, 서버 주소, IP 주소, 파일명 등 개인정보나 비밀값은 공개 이슈에 첨부하지 마세요.</p>
 </div></section>}
