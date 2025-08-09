# 🔧 Google Calendar API 설정 가이드

Google Calendar와 연동하여 스케줄을 동기화하려면 다음 단계를 따라 설정해주세요.

## 📋 사전 요구사항

1. Google 계정
2. Google Cloud Console 접근 권한

## 🚀 설정 단계

### 1. Google Cloud Console 프로젝트 생성

1. **Google Cloud Console** 접속: https://console.cloud.google.com
2. **새 프로젝트 생성**:
   - 프로젝트 선택 → "새 프로젝트"
   - 프로젝트 이름: `Schedule App` (원하는 이름)
   - 생성 클릭

### 2. Google Calendar API 활성화

1. **API 및 서비스** → **라이브러리** 이동
2. **"Google Calendar API"** 검색
3. **Google Calendar API** 선택 후 **"사용"** 클릭

### 3. API 키 생성

1. **API 및 서비스** → **사용자 인증 정보** 이동
2. **"사용자 인증 정보 만들기"** → **"API 키"** 선택
3. API 키가 생성되면 복사하여 보관
4. **선택사항**: API 키 제한 설정
   - **애플리케이션 제한사항**: HTTP 리퍼러(웹사이트)
   - **웹사이트 제한사항**: 도메인 추가 (예: `https://kimjs99.github.io/schedule-app/*`)

### 4. OAuth 2.0 클라이언트 ID 생성

1. **"사용자 인증 정보 만들기"** → **"OAuth 클라이언트 ID"** 선택
2. **동의 화면 구성** (처음인 경우):
   - **사용자 유형**: 외부 선택
   - **앱 이름**: `Schedule App`
   - **사용자 지원 이메일**: 본인 이메일
   - **개발자 연락처 정보**: 본인 이메일
   - **저장 후 계속**

3. **OAuth 클라이언트 ID 생성**:
   - **애플리케이션 유형**: 웹 애플리케이션
   - **이름**: `Schedule App Web Client`
   - **승인된 JavaScript 원본**: 
     - `https://kimjs99.github.io` (GitHub Pages 도메인)
     - `http://localhost:3000` (로컬 테스트용)
   - **승인된 리디렉션 URI**: 
     - `https://kimjs99.github.io/schedule-app/`
     - `http://localhost:3000` (로컬 테스트용)

4. **생성** 후 클라이언트 ID 복사하여 보관

### 5. OAuth 동의 화면 설정

1. **OAuth 동의 화면** 탭 이동
2. **범위 추가 또는 삭제**:
   - `https://www.googleapis.com/auth/calendar` 추가
3. **테스트 사용자 추가** (개발 중):
   - 본인 Gmail 주소 추가

## 🔑 애플리케이션에 설정 적용

### config.js 파일 수정

```javascript
const CONFIG = {
    GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',        // ← 생성한 API 키
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',    // ← 생성한 클라이언트 ID
    
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar',
    
    CALENDAR_NAME: 'Schedule App Calendar',
    CALENDAR_DESCRIPTION: 'Schedule App에서 생성된 일정들을 저장하는 캘린더',
    CALENDAR_COLOR: '#667eea'
};
```

### 설정 확인

1. `config.js` 파일에서 다음을 교체:
   - `YOUR_API_KEY_HERE` → 생성한 API 키
   - `YOUR_CLIENT_ID_HERE` → 생성한 클라이언트 ID

2. 웹 애플리케이션 실행 후 **"Google Calendar 연동"** 버튼 클릭

3. Google 로그인 및 권한 승인

## 🎯 기능

### ✅ 연동 후 사용 가능한 기능

- **실시간 동기화**: Google Calendar와 실시간 동기화
- **양방향 연동**: 앱에서 추가한 일정이 Google Calendar에 표시
- **오프라인 지원**: 인터넷 연결이 없어도 로컬에 저장 후 나중에 동기화
- **우선순위별 색상**: 우선순위에 따라 Google Calendar에서 색상으로 구분
- **전용 캘린더**: "Schedule App Calendar" 전용 캘린더 자동 생성

### 🔄 동기화 상태 표시

- **☁️**: Google Calendar와 동기화 완료
- **⏳**: 동기화 대기 중
- **❌**: 동기화 실패
- **📱**: 오프라인 (로컬 저장만)

## 🚨 문제해결

### 인증 오류가 발생하는 경우

1. **도메인 확인**: 승인된 JavaScript 원본과 현재 도메인 일치 확인
2. **API 키 제한**: API 키 제한 설정이 현재 도메인을 차단하지 않는지 확인
3. **권한 확인**: OAuth 동의 화면에서 Calendar API 권한 확인

### API 할당량 초과

- Google Cloud Console에서 API 사용량 확인
- 필요시 할당량 증가 요청

### 동기화 문제

1. **"동기화"** 버튼을 수동으로 클릭
2. 브라우저 개발자 도구(F12)에서 콘솔 오류 확인
3. 로그아웃 후 재로그인 시도

## 🔒 보안 주의사항

1. **API 키 보호**: 공개 저장소에 실제 API 키 업로드 금지
2. **도메인 제한**: API 키와 OAuth 클라이언트에 도메인 제한 설정 권장
3. **권한 최소화**: 필요한 권한만 요청 (Calendar 읽기/쓰기)

## 📝 참고 자료

- [Google Calendar API 문서](https://developers.google.com/calendar/api)
- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)