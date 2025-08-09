import { CONFIG } from './config.js';

// Google Calendar API 연동 모듈 (완전 분리된 GIS 방식)
class GoogleCalendarAPI {
    constructor() {
        this.gapi = null;
        this.tokenClient = null;
        this.accessToken = null;
        this.isSignedIn = false;
        this.currentUser = null;
        this.calendarId = null;
        this.initPromise = null;
    }

    // Google API 초기화 (완전 분리된 방식)
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                // Google API 스크립트 로드 대기
                await this.waitForGapi();
                await this.waitForGoogleAccounts();
                
                // Google API 클라이언트 초기화 (인증 없이, Calendar API만)
                await new Promise((loadResolve, loadReject) => {
                    gapi.load('client', {
                        callback: () => {
                            console.log('✅ gapi.client 로드 완료');
                            loadResolve();
                        },
                        onerror: (error) => {
                            console.error('❌ gapi.client 로드 실패:', error);
                            loadReject(error);
                        }
                    });
                });

                // API 클라이언트 초기화 (인증 부분 완전 제거)
                await gapi.client.init({
                    apiKey: CONFIG.GOOGLE_API_KEY,
                    discoveryDocs: [CONFIG.DISCOVERY_DOC]
                    // clientId 및 scope 완전 제거하여 auth2 초기화 방지
                });

                console.log('✅ gapi.client 초기화 완료 (인증 분리)');

                // Google Identity Services OAuth 클라이언트 초기화
                try {
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CONFIG.GOOGLE_CLIENT_ID,
                        scope: CONFIG.SCOPES,
                        callback: (response) => {
                            console.log('✅ OAuth 콜백 수신:', response);
                            if (response.access_token) {
                                this.accessToken = response.access_token;
                                this.isSignedIn = true;
                                
                                // gapi 클라이언트에 토큰 설정
                                gapi.client.setToken({ access_token: response.access_token });
                                
                                this.handleSignIn();
                            } else if (response.error) {
                                console.error('❌ OAuth 응답 오류:', response.error);
                                this.isSignedIn = false;
                                this.accessToken = null;
                                this.updateAuthUI(false);
                            }
                        },
                        error_callback: (error) => {
                            console.error('❌ OAuth 오류:', error);
                            this.isSignedIn = false;
                            this.accessToken = null;
                            this.updateAuthUI(false);
                        }
                    });
                } catch (tokenClientError) {
                    console.error('❌ TokenClient 초기화 실패:', tokenClientError);
                    throw tokenClientError;
                }

                console.log('✅ GIS OAuth 클라이언트 초기화 완료');
                this.gapi = gapi;

                // 저장된 토큰이 있는지 확인 (새로고침 후 복원용)
                const savedToken = localStorage.getItem('google_access_token');
                if (savedToken) {
                    try {
                        // 토큰 유효성 확인
                        gapi.client.setToken({ access_token: savedToken });
                        const testResponse = await gapi.client.calendar.calendarList.list({ maxResults: 1 });
                        
                        if (testResponse) {
                            this.accessToken = savedToken;
                            this.isSignedIn = true;
                            await this.ensureCalendarExists();
                            this.updateAuthUI(true);
                        }
                    } catch (error) {
                        // 토큰이 만료되었으면 제거
                        localStorage.removeItem('google_access_token');
                        gapi.client.setToken(null);
                    }
                }

                console.log('✅ Google Calendar API 초기화 완료');
                resolve();
            } catch (error) {
                console.error('❌ Google API 초기화 실패:', error);
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

    // Google Identity Services 라이브러리 로드 대기
    waitForGoogleAccounts() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5초 타임아웃
            
            const checkGoogle = () => {
                attempts++;
                
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    console.log('✅ Google Identity Services 로드 완료');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Google Identity Services 로드 타임아웃');
                    reject(new Error('Google Identity Services 로드 타임아웃'));
                } else {
                    setTimeout(checkGoogle, 100);
                }
            };
            checkGoogle();
        });
    }

    // 로그인 (GIS 방식)
    async signIn() {
        try {
            if (!this.tokenClient) {
                throw new Error('OAuth 클라이언트가 초기화되지 않았습니다.');
            }
            
            console.log('🔐 Google 로그인 시작...');
            
            // Google Identity Services로 로그인 요청
            // 콜백은 이미 tokenClient 초기화에서 설정됨
            this.tokenClient.requestAccessToken({ 
                prompt: 'consent',
                include_granted_scopes: true
            });
            
            return true;
        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            throw error;
        }
    }

    // 로그아웃
    async signOut() {
        try {
            if (this.accessToken) {
                // Google Identity Services로 토큰 해제
                google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('✅ 토큰 해제 완료');
                });
            }
            
            // 로컬 상태 정리
            gapi.client.setToken(null);
            localStorage.removeItem('google_access_token');
            
            this.isSignedIn = false;
            this.accessToken = null;
            this.currentUser = null;
            this.calendarId = null;
            
            this.updateAuthUI(false);
            
            // 인증 상태 변경 이벤트 발생
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { isSignedIn: false, user: null }
            }));
            
            return true;
        } catch (error) {
            console.error('❌ 로그아웃 실패:', error);
            throw error;
        }
    }

    // 로그인 성공 처리
    async handleSignIn() {
        try {
            console.log('✅ 로그인 성공 처리 시작');
            
            // 토큰 저장 (새로고침 시 복원용)
            if (this.accessToken) {
                localStorage.setItem('google_access_token', this.accessToken);
            }
            
            // 가짜 사용자 객체 (실제 사용자 정보는 필요하지 않음)
            this.currentUser = { 
                getBasicProfile: () => ({ 
                    getEmail: () => 'user@gmail.com' 
                }) 
            };
            
            // 캘린더 설정 및 UI 업데이트
            await this.ensureCalendarExists();
            this.updateAuthUI(true);
            
            // 인증 상태 변경 이벤트 발생
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { isSignedIn: true, user: this.currentUser }
            }));
            
            console.log('✅ 로그인 후 처리 완료');
        } catch (error) {
            console.error('❌ 로그인 후 처리 실패:', error);
        }
    }

    // 전용 캘린더 확인 및 생성
    async ensureCalendarExists() {
        try {
            console.log('📅 캘린더 확인 중...');
            
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
                console.log('📅 새 캘린더 생성 중...');
                
                // 새 캘린더 생성
                const createResponse = await gapi.client.calendar.calendars.insert({
                    resource: {
                        summary: CONFIG.CALENDAR_NAME,
                        description: CONFIG.CALENDAR_DESCRIPTION,
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                });

                this.calendarId = createResponse.result.id;
                console.log('✅ 새 캘린더 생성 완료:', this.calendarId);
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
        const authStatus = document.getElementById('connectionStatus');
        
        if (authButton) {
            if (isSignedIn) {
                authButton.textContent = '로그아웃';
                authButton.className = 'auth-button signed-in';
                authButton.disabled = false;
            } else {
                authButton.textContent = 'Google Calendar 연동';
                authButton.className = 'auth-button signed-out';
                authButton.disabled = false;
            }
        }

        if (authStatus) {
            if (isSignedIn) {
                authStatus.textContent = 'Google Calendar 연결됨';
                authStatus.className = 'connected';
            } else {
                authStatus.textContent = '오프라인 모드';
                authStatus.className = 'offline';
            }
        }
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