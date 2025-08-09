import { CONFIG } from './config.js';

// Google Calendar API 연동 모듈
class GoogleCalendarAPI {
    constructor() {
        this.gapi = null;
        this.isSignedIn = false;
        this.currentUser = null;
        this.calendarId = null;
        this.initPromise = null;
    }

    // Google API 초기화
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                // Google API 스크립트 로드 대기
                await this.waitForGapi();
                
                // API 클라이언트 초기화 (안전한 방식)
                await new Promise((loadResolve, loadReject) => {
                    const timeoutId = setTimeout(() => {
                        loadReject(new Error('Google API 로드 타임아웃'));
                    }, 15000); // 15초 타임아웃

                    gapi.load('client:auth2', () => {
                        clearTimeout(timeoutId);
                        console.log('✅ gapi.client 로드 완료');
                        loadResolve();
                    });
                });

                // 클라이언트 초기화
                await gapi.client.init({
                    apiKey: CONFIG.GOOGLE_API_KEY,
                    clientId: CONFIG.GOOGLE_CLIENT_ID,
                    discoveryDocs: [CONFIG.DISCOVERY_DOC],
                    scope: CONFIG.SCOPES
                });

                console.log('✅ gapi.client 초기화 완료');
                this.gapi = gapi;
                
                // 로그인 상태 확인
                const authInstance = gapi.auth2.getAuthInstance();
                this.isSignedIn = authInstance.isSignedIn.get();
                
                if (this.isSignedIn) {
                    this.currentUser = authInstance.currentUser.get();
                    await this.ensureCalendarExists();
                }

                // 로그인 상태 변경 리스너
                authInstance.isSignedIn.listen((signedIn) => {
                    this.isSignedIn = signedIn;
                    if (signedIn) {
                        this.currentUser = authInstance.currentUser.get();
                        this.ensureCalendarExists();
                    } else {
                        this.currentUser = null;
                        this.calendarId = null;
                    }
                    this.updateAuthUI(signedIn);
                });

                console.log('✅ Google Calendar API 초기화 완료');
                resolve();
            } catch (error) {
                console.error('❌ Google API 로드 실패:', error);
                reject(error);
            }
        });

        return this.initPromise;
    }

    // gapi 로드 대기
    waitForGapi() {
        return new Promise((resolve) => {
            const checkGapi = () => {
                if (window.gapi) {
                    resolve();
                } else {
                    setTimeout(checkGapi, 100);
                }
            };
            checkGapi();
        });
    }

    // 로그인
    async signIn() {
        try {
            if (!this.gapi) {
                throw new Error('Google API가 초기화되지 않았습니다.');
            }
            
            const authInstance = this.gapi.auth2.getAuthInstance();
            await authInstance.signIn();
            
            this.isSignedIn = true;
            this.currentUser = authInstance.currentUser.get();
            
            await this.ensureCalendarExists();
            return true;
        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            throw error;
        }
    }

    // 로그아웃
    async signOut() {
        try {
            if (!this.gapi) return;
            
            const authInstance = this.gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            
            this.isSignedIn = false;
            this.currentUser = null;
            this.calendarId = null;
            
            return true;
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            throw error;
        }
    }

    // 전용 캘린더 확인 및 생성
    async ensureCalendarExists() {
        try {
            // 기존 캘린더 목록에서 찾기
            const response = await gapi.client.calendar.calendarList.list();
            const calendars = response.result.items || [];
            
            let targetCalendar = calendars.find(cal => 
                cal.summary === CONFIG.CALENDAR_NAME
            );

            if (targetCalendar) {
                this.calendarId = targetCalendar.id;
                console.log('✅ 기존 캘린더 사용:', this.calendarId);
            } else {
                // 새 캘린더 생성
                const createResponse = await gapi.client.calendar.calendars.insert({
                    resource: {
                        summary: CONFIG.CALENDAR_NAME,
                        description: CONFIG.CALENDAR_DESCRIPTION,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                });

                this.calendarId = createResponse.result.id;
                
                // 캘린더 색상 설정
                await gapi.client.calendar.calendarList.patch({
                    calendarId: this.calendarId,
                    resource: {
                        backgroundColor: CONFIG.CALENDAR_COLOR,
                        foregroundColor: '#ffffff'
                    }
                });

                console.log('✅ 새 캘린더 생성:', this.calendarId);
            }
        } catch (error) {
            console.error('❌ 캘린더 설정 실패:', error);
            throw error;
        }
    }

    // 이벤트 생성
    async createEvent(eventData) {
        if (!this.isSignedIn || !this.calendarId) {
            throw new Error('Google Calendar에 로그인이 필요합니다.');
        }

        try {
            const event = this.formatEventForGoogle(eventData);
            
            const response = await gapi.client.calendar.events.insert({
                calendarId: this.calendarId,
                resource: event
            });

            console.log('✅ 이벤트 생성 완료:', response.result.id);
            return {
                id: response.result.id,
                ...eventData
            };
        } catch (error) {
            console.error('❌ 이벤트 생성 실패:', error);
            throw error;
        }
    }

    // 이벤트 업데이트
    async updateEvent(eventId, eventData) {
        if (!this.isSignedIn || !this.calendarId) {
            throw new Error('Google Calendar에 로그인이 필요합니다.');
        }

        try {
            const event = this.formatEventForGoogle(eventData);
            
            const response = await gapi.client.calendar.events.update({
                calendarId: this.calendarId,
                eventId: eventId,
                resource: event
            });

            console.log('✅ 이벤트 업데이트 완료:', eventId);
            return {
                id: eventId,
                ...eventData
            };
        } catch (error) {
            console.error('❌ 이벤트 업데이트 실패:', error);
            throw error;
        }
    }

    // 이벤트 삭제
    async deleteEvent(eventId) {
        if (!this.isSignedIn || !this.calendarId) {
            throw new Error('Google Calendar에 로그인이 필요합니다.');
        }

        try {
            await gapi.client.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId
            });

            console.log('✅ 이벤트 삭제 완료:', eventId);
            return true;
        } catch (error) {
            console.error('❌ 이벤트 삭제 실패:', error);
            throw error;
        }
    }

    // 이벤트 목록 조회
    async getEvents() {
        if (!this.isSignedIn || !this.calendarId) {
            return [];
        }

        try {
            const response = await gapi.client.calendar.events.list({
                calendarId: this.calendarId,
                timeMin: new Date().toISOString(),
                showDeleted: false,
                singleEvents: true,
                maxResults: 1000,
                orderBy: 'startTime'
            });

            const events = response.result.items || [];
            return events.map(event => this.formatEventFromGoogle(event));
        } catch (error) {
            console.error('❌ 이벤트 조회 실패:', error);
            return [];
        }
    }

    // 앱 형식 -> Google Calendar 형식 변환
    formatEventForGoogle(eventData) {
        const startDateTime = new Date(`${eventData.date}T${eventData.time}`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1); // 기본 1시간 이벤트

        return {
            summary: eventData.title,
            description: eventData.description || '',
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            extendedProperties: {
                private: {
                    priority: eventData.priority || 'medium',
                    scheduleAppId: eventData.id || Date.now().toString()
                }
            },
            colorId: this.getPriorityColorId(eventData.priority)
        };
    }

    // Google Calendar -> 앱 형식 변환
    formatEventFromGoogle(googleEvent) {
        const startDate = new Date(googleEvent.start.dateTime || googleEvent.start.date);
        const priority = googleEvent.extendedProperties?.private?.priority || 'medium';
        const scheduleAppId = googleEvent.extendedProperties?.private?.scheduleAppId || googleEvent.id;

        return {
            id: scheduleAppId,
            googleEventId: googleEvent.id,
            title: googleEvent.summary || '제목 없음',
            date: startDate.toISOString().split('T')[0],
            time: startDate.toTimeString().slice(0, 5),
            description: googleEvent.description || '',
            priority: priority,
            createdAt: googleEvent.created
        };
    }

    // 우선순위별 색상 ID 반환
    getPriorityColorId(priority) {
        const colorMap = {
            high: '11', // 빨간색
            medium: '5', // 노란색  
            low: '2'     // 초록색
        };
        return colorMap[priority] || '1';
    }

    // 인증 UI 업데이트
    updateAuthUI(isSignedIn) {
        const authButton = document.getElementById('authButton');
        const authStatus = document.getElementById('authStatus');
        
        if (authButton) {
            if (isSignedIn) {
                authButton.textContent = '로그아웃';
                authButton.className = 'auth-button signed-in';
            } else {
                authButton.textContent = 'Google Calendar 연동';
                authButton.className = 'auth-button signed-out';
            }
        }

        if (authStatus) {
            if (isSignedIn) {
                const email = this.currentUser?.getBasicProfile()?.getEmail() || '';
                authStatus.textContent = `연동됨: ${email}`;
                authStatus.className = 'auth-status connected';
            } else {
                authStatus.textContent = '오프라인 모드 (로컬 저장)';
                authStatus.className = 'auth-status disconnected';
            }
        }

        // 커스텀 이벤트 발생
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { isSignedIn, user: this.currentUser }
        }));
    }

    // 연결 상태 확인
    isConnected() {
        return this.isSignedIn && this.calendarId;
    }
}

// 전역 인스턴스 생성
const googleCalendar = new GoogleCalendarAPI();

// 전역 접근을 위해 window 객체에 할당
window.googleCalendar = googleCalendar;

export { googleCalendar };