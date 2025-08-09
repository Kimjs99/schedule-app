import { CONFIG, validateConfig } from './config.js';
import { googleCalendar } from './google-calendar.js';

// Google Calendar 연동 스케줄 관리자
class ScheduleManager {
    constructor() {
        this.schedules = [];
        this.currentEditId = null;
        this.isOnline = false;
        this.syncInProgress = false;
        
        this.initializeApp();
    }

    async initializeApp() {
        // 로컬 데이터 로드
        this.loadLocalSchedules();
        
        // 이벤트 리스너 초기화
        this.initializeEventListeners();
        
        // 초기 렌더링
        await this.renderSchedules();

        try {
            // Google Calendar API 초기화
            if (validateConfig()) {
                console.log('🔄 Google Calendar API 초기화 중...');
                this.updateAuthButtonState(false, '초기화 중...');
                
                await googleCalendar.initialize();
                this.isOnline = googleCalendar.isConnected();
                
                console.log('✅ Google Calendar API 초기화 완료');
                this.updateAuthButtonState(true, 'Google Calendar 연동');
            } else {
                console.warn('⚠️ Google Calendar API 설정이 필요합니다.');
                this.updateAuthButtonState(false, '설정 필요');
            }
        } catch (error) {
            console.warn('Google Calendar API 초기화 실패, 오프라인 모드로 실행:', error);
            this.isOnline = false;
            this.updateAuthButtonState(false, '연동 불가');
        }
        
        // 인증 상태 변경 리스너
        window.addEventListener('authStateChanged', (e) => {
            this.handleAuthStateChange(e.detail);
        });
        
        console.log('✅ 스케줄 매니저 초기화 완료');
    }

    initializeEventListeners() {
        const form = document.getElementById('scheduleForm');
        const clearAllBtn = document.getElementById('clearAll');
        const filterSelect = document.getElementById('filterPriority');
        const authButton = document.getElementById('authButton');
        const syncButton = document.getElementById('syncButton');

        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        clearAllBtn.addEventListener('click', () => this.clearAllSchedules());
        filterSelect.addEventListener('change', (e) => this.filterSchedules(e.target.value));
        
        if (authButton) {
            authButton.addEventListener('click', () => this.handleAuth());
        }
        
        if (syncButton) {
            syncButton.addEventListener('click', () => this.syncWithGoogle());
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('title').value.trim(),
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            description: document.getElementById('description').value.trim(),
            priority: document.getElementById('priority').value
        };

        if (!this.validateForm(formData)) {
            return;
        }

        try {
            if (this.currentEditId) {
                await this.updateSchedule(this.currentEditId, formData);
            } else {
                await this.addSchedule(formData);
            }

            this.resetForm();
            await this.renderSchedules();
        } catch (error) {
            console.error('일정 처리 중 오류:', error);
            this.showNotification('일정 처리 중 오류가 발생했습니다.', 'error');
        }
    }

    validateForm(data) {
        if (!data.title) {
            alert('제목을 입력해주세요.');
            return false;
        }
        if (!data.date) {
            alert('날짜를 선택해주세요.');
            return false;
        }
        if (!data.time) {
            alert('시간을 선택해주세요.');
            return false;
        }
        return true;
    }

    async addSchedule(data) {
        const schedule = {
            id: Date.now().toString(),
            ...data,
            createdAt: new Date().toISOString(),
            syncStatus: 'pending'
        };

        try {
            if (googleCalendar.isConnected()) {
                const googleEvent = await googleCalendar.createEvent(schedule);
                schedule.googleEventId = googleEvent.id;
                schedule.syncStatus = 'synced';
                this.showNotification('일정이 Google Calendar에 추가되었습니다.', 'success');
            } else {
                this.showNotification('일정이 로컬에 저장되었습니다. (오프라인)', 'info');
            }
        } catch (error) {
            console.error('Google Calendar 추가 실패:', error);
            schedule.syncStatus = 'failed';
            this.showNotification('일정을 로컬에 저장했습니다. 나중에 동기화됩니다.', 'info');
        }

        this.schedules.push(schedule);
        this.saveLocalSchedules();
    }

    async updateSchedule(id, data) {
        const index = this.schedules.findIndex(schedule => schedule.id === id);
        if (index === -1) return;

        const schedule = this.schedules[index];
        const updatedSchedule = { ...schedule, ...data, syncStatus: 'pending' };

        try {
            if (googleCalendar.isConnected() && schedule.googleEventId) {
                await googleCalendar.updateEvent(schedule.googleEventId, updatedSchedule);
                updatedSchedule.syncStatus = 'synced';
                this.showNotification('일정이 Google Calendar에서 수정되었습니다.', 'success');
            } else {
                this.showNotification('일정이 로컬에서 수정되었습니다. (오프라인)', 'info');
            }
        } catch (error) {
            console.error('Google Calendar 수정 실패:', error);
            updatedSchedule.syncStatus = 'failed';
            this.showNotification('일정을 로컬에서 수정했습니다. 나중에 동기화됩니다.', 'info');
        }

        this.schedules[index] = updatedSchedule;
        this.saveLocalSchedules();
        this.currentEditId = null;

        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.textContent = '일정 추가';
    }

    async deleteSchedule(id) {
        if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) return;

        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return;

        try {
            if (googleCalendar.isConnected() && schedule.googleEventId) {
                await googleCalendar.deleteEvent(schedule.googleEventId);
                this.showNotification('일정이 Google Calendar에서 삭제되었습니다.', 'success');
            } else {
                this.showNotification('일정이 로컬에서 삭제되었습니다.', 'info');
            }
        } catch (error) {
            console.error('Google Calendar 삭제 실패:', error);
            this.showNotification('일정을 로컬에서 삭제했습니다.', 'info');
        }

        this.schedules = this.schedules.filter(schedule => schedule.id !== id);
        this.saveLocalSchedules();
        await this.renderSchedules();
    }

    editSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return;

        document.getElementById('title').value = schedule.title;
        document.getElementById('date').value = schedule.date;
        document.getElementById('time').value = schedule.time;
        document.getElementById('description').value = schedule.description || '';
        document.getElementById('priority').value = schedule.priority;

        this.currentEditId = id;
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.textContent = '일정 수정';

        document.getElementById('title').focus();
    }

    async clearAllSchedules() {
        if (this.schedules.length === 0) {
            alert('삭제할 일정이 없습니다.');
            return;
        }

        if (!confirm('모든 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            if (googleCalendar.isConnected()) {
                const deletePromises = this.schedules
                    .filter(schedule => schedule.googleEventId)
                    .map(schedule => googleCalendar.deleteEvent(schedule.googleEventId));
                
                await Promise.allSettled(deletePromises);
                this.showNotification('모든 일정이 Google Calendar에서 삭제되었습니다.', 'success');
            } else {
                this.showNotification('모든 일정이 로컬에서 삭제되었습니다.', 'info');
            }
        } catch (error) {
            console.error('일괄 삭제 중 오류:', error);
        }

        this.schedules = [];
        this.saveLocalSchedules();
        await this.renderSchedules();
    }

    async syncWithGoogle() {
        if (!googleCalendar.isConnected()) {
            this.showNotification('Google Calendar에 로그인해주세요.', 'error');
            return;
        }

        if (this.syncInProgress) return;

        this.syncInProgress = true;
        this.updateSyncUI(true);

        try {
            // Google Calendar에서 이벤트 가져오기
            const googleEvents = await googleCalendar.getEvents();
            
            // 로컬 일정 중 동기화 필요한 것들 처리
            const syncPromises = this.schedules
                .filter(schedule => schedule.syncStatus === 'pending' || schedule.syncStatus === 'failed')
                .map(async (schedule) => {
                    try {
                        if (schedule.googleEventId) {
                            await googleCalendar.updateEvent(schedule.googleEventId, schedule);
                        } else {
                            const googleEvent = await googleCalendar.createEvent(schedule);
                            schedule.googleEventId = googleEvent.id;
                        }
                        schedule.syncStatus = 'synced';
                    } catch (error) {
                        console.error('개별 동기화 실패:', error);
                        schedule.syncStatus = 'failed';
                    }
                });

            await Promise.allSettled(syncPromises);

            // Google Calendar의 새 이벤트들을 로컬에 추가
            const localEventIds = new Set(this.schedules.map(s => s.googleEventId));
            const newGoogleEvents = googleEvents.filter(event => 
                !localEventIds.has(event.googleEventId)
            );

            newGoogleEvents.forEach(event => {
                event.syncStatus = 'synced';
                this.schedules.push(event);
            });

            this.saveLocalSchedules();
            await this.renderSchedules();

            this.showNotification('Google Calendar와 동기화가 완료되었습니다.', 'success');
        } catch (error) {
            console.error('동기화 실패:', error);
            this.showNotification('동기화 중 오류가 발생했습니다.', 'error');
        } finally {
            this.syncInProgress = false;
            this.updateSyncUI(false);
        }
    }

    async handleAuth() {
        try {
            // Google API가 초기화되었는지 확인
            if (!googleCalendar.gapi) {
                this.showNotification('Google API가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.', 'error');
                return;
            }

            if (googleCalendar.isSignedIn) {
                await googleCalendar.signOut();
                this.isOnline = false;
                this.showNotification('Google Calendar에서 로그아웃되었습니다.', 'info');
            } else {
                await googleCalendar.signIn();
                this.isOnline = true;
                this.showNotification('Google Calendar에 연결되었습니다.', 'success');
                await this.syncWithGoogle();
            }
        } catch (error) {
            console.error('인증 처리 실패:', error);
            this.showNotification('인증 중 오류가 발생했습니다.', 'error');
        }
    }

    updateAuthButtonState(enabled, text) {
        const authButton = document.getElementById('authButton');
        if (authButton) {
            authButton.disabled = !enabled;
            authButton.textContent = text;
            
            if (enabled) {
                authButton.classList.remove('disabled');
            } else {
                authButton.classList.add('disabled');
            }
        }
    }

    handleAuthStateChange(detail) {
        this.isOnline = detail.isSignedIn;
        if (detail.isSignedIn) {
            // 로그인 시 자동 동기화
            setTimeout(() => this.syncWithGoogle(), 1000);
        }
        this.updateConnectionStatus();
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = this.isOnline ? 'Google Calendar 연결됨' : '오프라인 모드';
            statusElement.className = this.isOnline ? 'connected' : 'offline';
        }
    }

    updateSyncUI(syncing) {
        const syncButton = document.getElementById('syncButton');
        if (syncButton) {
            syncButton.textContent = syncing ? '동기화 중...' : '동기화';
            syncButton.disabled = syncing;
        }
    }

    filterSchedules(priority) {
        this.renderSchedules(priority);
    }

    async renderSchedules(filterPriority = 'all') {
        const container = document.getElementById('scheduleList');
        
        let filteredSchedules = this.schedules;
        if (filterPriority !== 'all') {
            filteredSchedules = this.schedules.filter(schedule => schedule.priority === filterPriority);
        }

        filteredSchedules.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.time);
            const dateB = new Date(b.date + ' ' + b.time);
            return dateA - dateB;
        });

        if (filteredSchedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>${filterPriority === 'all' ? '등록된 일정이 없습니다.' : '해당 우선순위의 일정이 없습니다.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredSchedules.map(schedule => this.createScheduleHTML(schedule)).join('');
    }

    createScheduleHTML(schedule) {
        const datetime = this.formatDateTime(schedule.date, schedule.time);
        const priorityText = this.getPriorityText(schedule.priority);
        const isOverdue = this.isOverdue(schedule.date, schedule.time);
        const syncStatusIcon = this.getSyncStatusIcon(schedule.syncStatus);
        
        return `
            <div class="schedule-item priority-${schedule.priority} ${isOverdue ? 'overdue' : ''}" data-id="${schedule.id}">
                <div class="schedule-header">
                    <div>
                        <div class="schedule-title">
                            ${this.escapeHtml(schedule.title)}
                            <span class="sync-status">${syncStatusIcon}</span>
                        </div>
                        <div class="schedule-datetime">${datetime} ${isOverdue ? '(지남)' : ''}</div>
                    </div>
                    <span class="priority-badge priority-${schedule.priority}">${priorityText}</span>
                </div>
                
                ${schedule.description ? `<div class="schedule-description">${this.escapeHtml(schedule.description)}</div>` : ''}
                
                <div class="schedule-actions">
                    <button class="btn-small btn-edit" onclick="scheduleManager.editSchedule('${schedule.id}')">
                        수정
                    </button>
                    <button class="btn-small btn-delete" onclick="scheduleManager.deleteSchedule('${schedule.id}')">
                        삭제
                    </button>
                </div>
            </div>
        `;
    }

    getSyncStatusIcon(status) {
        const icons = {
            synced: '☁️',
            pending: '⏳',
            failed: '❌',
            offline: '📱'
        };
        return icons[status] || icons.offline;
    }

    formatDateTime(date, time) {
        const scheduleDate = new Date(date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const isToday = scheduleDate.toDateString() === today.toDateString();
        const isTomorrow = scheduleDate.toDateString() === tomorrow.toDateString();
        
        let dateStr;
        if (isToday) {
            dateStr = '오늘';
        } else if (isTomorrow) {
            dateStr = '내일';
        } else {
            dateStr = scheduleDate.toLocaleDateString('ko-KR', { 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
            });
        }
        
        const timeStr = new Date(`2000-01-01 ${time}`).toLocaleTimeString('ko-KR', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        return `${dateStr} ${timeStr}`;
    }

    getPriorityText(priority) {
        const priorities = {
            high: '높음',
            medium: '보통',
            low: '낮음'
        };
        return priorities[priority] || '보통';
    }

    isOverdue(date, time) {
        const scheduleDateTime = new Date(date + ' ' + time);
        const now = new Date();
        return scheduleDateTime < now;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    resetForm() {
        document.getElementById('scheduleForm').reset();
        this.currentEditId = null;
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.textContent = '일정 추가';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            ${type === 'success' ? 'background: #38a169;' : ''}
            ${type === 'error' ? 'background: #e53e3e;' : ''}
            ${type === 'info' ? 'background: #4299e1;' : ''}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    saveLocalSchedules() {
        try {
            localStorage.setItem('schedules_v2', JSON.stringify(this.schedules));
        } catch (error) {
            console.error('로컬 저장 실패:', error);
        }
    }

    loadLocalSchedules() {
        try {
            // 새 버전 데이터 로드
            const savedV2 = localStorage.getItem('schedules_v2');
            if (savedV2) {
                this.schedules = JSON.parse(savedV2);
                return;
            }

            // 기존 버전 데이터 마이그레이션
            const savedV1 = localStorage.getItem('schedules');
            if (savedV1) {
                const oldSchedules = JSON.parse(savedV1);
                this.schedules = oldSchedules.map(schedule => ({
                    ...schedule,
                    syncStatus: 'offline'
                }));
                this.saveLocalSchedules();
                localStorage.removeItem('schedules'); // 구 데이터 삭제
            }
        } catch (error) {
            console.error('로컬 데이터 로드 실패:', error);
            this.schedules = [];
        }
    }
}

// Google API 스크립트 로드 함수
function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
        // 이미 로드되어 있는지 확인
        if (window.gapi) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            console.log('✅ Google API 스크립트 로드 완료');
            resolve();
        };
        
        script.onerror = () => {
            console.error('❌ Google API 스크립트 로드 실패');
            reject(new Error('Google API script load failed'));
        };
        
        document.head.appendChild(script);
    });
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // Google API 스크립트 로드 및 대기
    await loadGoogleAPI();

    // 스케줄 매니저 초기화
    window.scheduleManager = new ScheduleManager();
    
    // 기본값 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    document.getElementById('time').value = currentTime;
});

// ESC 키로 폼 리셋
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.scheduleManager) {
        scheduleManager.resetForm();
    }
});