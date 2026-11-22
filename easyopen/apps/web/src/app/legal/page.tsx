import type {Metadata} from 'next';
import {buildPageMetadata} from '@/lib/site-metadata';

export const metadata:Metadata=buildPageMetadata({path:'/legal/',title:'운영·개인정보 안내',description:'EasyOpen 다운로드 출처, 개인정보 처리, 베타 배포와 오류 신고 안내.'});
const releases='https://github.com/ParkSuJeong74/my_own_note/releases';
const issues='https://github.com/ParkSuJeong74/my_own_note/issues';
const securityPolicy='https://github.com/ParkSuJeong74/my_own_note/security/policy';

export default function Legal(){return <section className="shell page-section article-narrow"><span className="section-kicker">OPERATING POLICY</span><h1 className="page-title">다운로드 전에 필요한 정보만<br/>분명하게 안내합니다.</h1><p className="page-desc">시행일: 2026년 10월 28일 · 최종 수정일: 2026년 11월 22일</p><div className="content-panel prose">
 <h2>운영 주체와 배포물</h2><p>EasyOpen 앱과 이 웹사이트는 MANO가 운영·배포합니다. EasyOpen에서 이용할 수 있는 오픈소스 프로그램의 이름, 상표, 소스와 원본 배포물은 각 권리자에게 귀속됩니다. EasyOpen 설치 파일과 각 원본 프로젝트의 배포물은 서로 다른 배포물입니다.</p>
 <h2>공식 다운로드 출처</h2><p>웹사이트가 안내하는 EasyOpen 설치 파일은 <a href={releases} target="_blank" rel="noreferrer noopener">공개 GitHub Releases</a>와 다운로드 페이지에 명시된 공식 테스트 채널에서 확인합니다. 파일이 공개됐다는 사실만으로 코드 서명, 실기기 설치 또는 정식 지원이 완료됐다고 보지 않습니다.</p>
 <h2>개인정보와 기술 로그</h2><p>이 웹사이트는 회원가입, 결제, 사용자 파일 업로드 기능을 제공하지 않습니다. Cloudflare가 호스팅과 보안을 위해 IP 주소, 요청 시각, 접속 경로, 브라우저 정보 등의 기술 로그를 처리할 수 있으며, 선택적 Cloudflare Web Analytics가 설정된 경우 쿠키 없는 방문 통계가 처리될 수 있습니다.</p>
 <h2>베타 배포와 책임 범위</h2><p>운영체제와 보안 설정에 따라 설치 또는 실행이 제한될 수 있습니다. 다운로드 성공은 설치·실행 성공을 뜻하지 않으며, 확인이 끝나지 않은 배포물은 다운로드 페이지에 베타 또는 미검증 상태로 표시합니다.</p>
 <h2>오류와 보안 문제 신고</h2><p>잘못된 다운로드 링크나 웹사이트 오류는 <a href={issues} target="_blank" rel="noreferrer noopener">GitHub Issues</a>로 알려주세요. 보안 취약점은 공개 이슈에 작성하지 말고 <a href={securityPolicy} target="_blank" rel="noreferrer noopener">보안 신고 안내</a>를 이용해 주세요. 비밀번호, 인증정보와 개인정보는 공개 이슈에 첨부하지 마세요.</p>
 </div></section>}
