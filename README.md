# 📅 스케줄 관리 웹앱 with Google Calendar

Google Calendar와 연동되는 스마트한 스케줄 관리 웹 애플리케이션입니다. 오프라인에서도 작동하며, 온라인 시 Google Calendar와 자동 동기화됩니다.

## 🚀 주요 기능

### ✨ 스케줄 관리
- **일정 추가/수정/삭제**: 제목, 날짜, 시간, 설명, 우선순위 설정
- **우선순위 필터링**: 높음/보통/낮음 우선순위별 필터링  
- **실시간 정렬**: 날짜와 시간순 자동 정렬
- **지난 일정 표시**: 현재 시간 기준 지난 일정 구분

### ☁️ Google Calendar 연동
- **양방향 동기화**: Google Calendar ↔ 스케줄 앱 실시간 동기화
- **오프라인 지원**: 인터넷 연결 없이도 로컬 저장 후 나중에 동기화
- **전용 캘린더**: "Schedule App Calendar" 자동 생성 및 관리
- **색상 코딩**: 우선순위에 따른 Google Calendar 색상 표시
- **동기화 상태**: 각 일정의 동기화 상태를 아이콘으로 표시

### 🎨 사용자 경험
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **직관적인 UI**: 깔끔하고 현대적인 인터페이스
- **실시간 알림**: 작업 상태를 즉시 알림
- **키보드 단축키**: ESC 키로 폼 리셋

## 📁 파일 구조

```
schedule-app/
├── index.html                  # 메인 HTML 파일
├── style.css                   # CSS 스타일시트  
├── script.js                   # 메인 JavaScript 로직
├── config.js                   # Google API 설정
├── google-calendar.js          # Google Calendar API 연동 모듈
├── README.md                   # 프로젝트 문서
├── GOOGLE_CALENDAR_SETUP.md    # Google Calendar 설정 가이드
└── backend/                    # 백엔드 서비스 (선택사항)
```

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- **API 연동**: Google Calendar API v3, OAuth 2.0
- **저장소**: 브라우저 로컬스토리지 + Google Calendar (하이브리드)
- **디자인**: Flexbox, CSS Grid, 반응형 디자인

## 🚀 빠른 시작

### 1. 기본 사용 (오프라인 모드)
```bash
# 저장소 클론
git clone https://github.com/Kimjs99/schedule-app.git
cd schedule-app

# 브라우저에서 index.html 열기
open index.html
```

### 2. Google Calendar 연동 설정

Google Calendar와 연동하려면 **[Google Calendar 설정 가이드](GOOGLE_CALENDAR_SETUP.md)**를 참고하여 API 키와 OAuth 클라이언트를 설정하세요.

1. **Google Cloud Console**에서 프로젝트 생성
2. **Calendar API** 활성화
3. **API 키** 및 **OAuth 2.0 클라이언트 ID** 생성
4. `config.js`에서 설정 값 입력

```javascript
// config.js
const CONFIG = {
    GOOGLE_API_KEY: 'your-api-key-here',
    GOOGLE_CLIENT_ID: 'your-client-id-here.apps.googleusercontent.com',
    // ... 기타 설정
};
```

## 🎯 사용법

### 🔐 Google Calendar 연동

1. **"Google Calendar 연동"** 버튼 클릭
2. Google 계정 로그인 및 권한 승인
3. 자동으로 "Schedule App Calendar" 생성
4. 이후 모든 일정이 Google Calendar와 실시간 동기화

### 📝 일정 관리

- **일정 추가**: 좌측 폼에서 정보 입력 후 "일정 추가" 클릭
- **일정 수정**: 각 일정의 "수정" 버튼 클릭
- **일정 삭제**: "삭제" 버튼으로 개별/전체 삭제
- **필터링**: 우선순위 드롭다운으로 필터링
- **동기화**: "동기화" 버튼으로 수동 동기화

### 🔄 동기화 상태 확인

각 일정 옆의 아이콘으로 동기화 상태 확인:
- **☁️**: Google Calendar와 동기화 완료
- **⏳**: 동기화 대기 중
- **❌**: 동기화 실패 (재시도 필요)
- **📱**: 오프라인 모드 (로컬 저장만)

## 🎨 디자인 특징

### 색상 테마
- **주 색상**: 보라색 그라데이션 (#667eea → #764ba2)
- **우선순위별 색상**:
  - 높음: 빨간색 (#e53e3e)
  - 보통: 주황색 (#ed8936)  
  - 낮음: 초록색 (#38a169)

### 반응형 디자인
- **데스크톱** (1200px+): 2열 레이아웃
- **태블릿** (768px~): 1열 레이아웃  
- **모바일** (480px-): 최적화된 터치 UI

## 💾 데이터 저장

### 하이브리드 저장 방식
- **온라인**: Google Calendar (클라우드 저장)
- **오프라인**: 브라우저 로컬스토리지
- **자동 동기화**: 온라인 연결 시 자동 동기화
- **데이터 마이그레이션**: 기존 로컬 데이터 자동 업그레이드

## 🔧 고급 설정

### 환경별 설정
```javascript
// 개발 환경
GOOGLE_CLIENT_ID: 'dev-client-id'
승인된 도메인: 'http://localhost:3000'

// 프로덕션 환경  
GOOGLE_CLIENT_ID: 'prod-client-id'
승인된 도메인: 'https://kimjs99.github.io'
```

### 캘린더 커스터마이징
```javascript
// config.js에서 수정 가능
CALENDAR_NAME: '나만의 스케줄 캘린더'
CALENDAR_COLOR: '#your-color'
```

## 🚨 문제해결

### 인증 문제
- 도메인이 OAuth 설정과 일치하는지 확인
- 브라우저 쿠키/캐시 삭제 후 재시도
- 개발자 도구에서 콘솔 오류 확인

### 동기화 문제
- "동기화" 버튼으로 수동 동기화 시도
- 로그아웃 후 재로그인
- API 할당량 확인 (Google Cloud Console)

## 🔒 보안 및 개인정보

- **로컬 우선**: 민감한 데이터는 로컬에 먼저 저장
- **최소 권한**: Calendar 읽기/쓰기 권한만 요청
- **도메인 제한**: API 키에 도메인 제한 설정
- **사용자 제어**: 언제든 연동 해제 가능

## 🌐 브라우저 호환성

- **Chrome** 60+
- **Firefox** 55+  
- **Safari** 12+
- **Edge** 79+

## 📱 PWA 지원 (추후 계획)

- 오프라인 캐싱
- 푸시 알림
- 앱처럼 설치 가능

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 자유롭게 사용, 수정, 배포할 수 있습니다.

## 🔗 링크

- **라이브 데모**: https://kimjs99.github.io/schedule-app/
- **GitHub**: https://github.com/Kimjs99/schedule-app
- **설정 가이드**: [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

---

**Made with ❤️ by [Claude Code](https://claude.ai/code)**