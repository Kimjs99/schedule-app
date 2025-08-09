// Google Calendar API 설정
const CONFIG = {
    // Google Cloud Console에서 발급받은 API 키와 클라이언트 ID를 여기에 입력하세요
    GOOGLE_API_KEY: 'AIzaSyB__jm-Whxz2YwQzV8Ew5Ml_SdenxGqbMo',
    GOOGLE_CLIENT_ID: '392710857989-3lb2t4mo5onljgu2cfdear56jmej604a.apps.googleusercontent.com',
    
    // Google Calendar API 설정
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar',
    
    // 캘린더 설정
    CALENDAR_NAME: 'Schedule App Calendar',
    CALENDAR_DESCRIPTION: 'Schedule App에서 생성된 일정들을 저장하는 캘린더',
    CALENDAR_COLOR: '#667eea'
};

// API 키와 클라이언트 ID 검증
function validateConfig() {
    if (CONFIG.GOOGLE_API_KEY === 'YOUR_API_KEY_HERE' || 
        CONFIG.GOOGLE_CLIENT_ID === '392710857989-3lb2t4mo5onljgu2cfdear56jmej604a.apps.googleusercontent.com') {
        console.warn('⚠️ Google Calendar API 설정이 필요합니다.');
        return false;
    }
    return true;
}

export { CONFIG, validateConfig };
