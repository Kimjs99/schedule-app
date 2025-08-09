class ScheduleManager {
    constructor() {
        this.schedules = this.loadSchedules();
        this.currentEditId = null;
        this.initializeEventListeners();
        this.renderSchedules();
    }

    initializeEventListeners() {
        const form = document.getElementById('scheduleForm');
        const clearAllBtn = document.getElementById('clearAll');
        const filterSelect = document.getElementById('filterPriority');

        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        clearAllBtn.addEventListener('click', () => this.clearAllSchedules());
        filterSelect.addEventListener('change', (e) => this.filterSchedules(e.target.value));
    }

    handleFormSubmit(e) {
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

        if (this.currentEditId) {
            this.updateSchedule(this.currentEditId, formData);
        } else {
            this.addSchedule(formData);
        }

        this.resetForm();
        this.renderSchedules();
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

    addSchedule(data) {
        const schedule = {
            id: Date.now().toString(),
            ...data,
            createdAt: new Date().toISOString()
        };
        
        this.schedules.push(schedule);
        this.saveSchedules();
        this.showNotification('일정이 추가되었습니다.', 'success');
    }

    updateSchedule(id, data) {
        const index = this.schedules.findIndex(schedule => schedule.id === id);
        if (index !== -1) {
            this.schedules[index] = { ...this.schedules[index], ...data };
            this.saveSchedules();
            this.currentEditId = null;
            this.showNotification('일정이 수정되었습니다.', 'success');
            
            const submitBtn = document.querySelector('button[type="submit"]');
            submitBtn.textContent = '일정 추가';
        }
    }

    deleteSchedule(id) {
        if (confirm('정말로 이 일정을 삭제하시겠습니까?')) {
            this.schedules = this.schedules.filter(schedule => schedule.id !== id);
            this.saveSchedules();
            this.renderSchedules();
            this.showNotification('일정이 삭제되었습니다.', 'error');
        }
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

    clearAllSchedules() {
        if (this.schedules.length === 0) {
            alert('삭제할 일정이 없습니다.');
            return;
        }

        if (confirm('모든 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            this.schedules = [];
            this.saveSchedules();
            this.renderSchedules();
            this.showNotification('모든 일정이 삭제되었습니다.', 'error');
        }
    }

    filterSchedules(priority) {
        this.renderSchedules(priority);
    }

    renderSchedules(filterPriority = 'all') {
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
        
        return `
            <div class="schedule-item priority-${schedule.priority} ${isOverdue ? 'overdue' : ''}" data-id="${schedule.id}">
                <div class="schedule-header">
                    <div>
                        <div class="schedule-title">${this.escapeHtml(schedule.title)}</div>
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
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    saveSchedules() {
        try {
            localStorage.setItem('schedules', JSON.stringify(this.schedules));
        } catch (error) {
            console.error('일정 저장 중 오류가 발생했습니다:', error);
            alert('일정 저장 중 오류가 발생했습니다. 브라우저의 저장소 설정을 확인해주세요.');
        }
    }

    loadSchedules() {
        try {
            const saved = localStorage.getItem('schedules');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('일정 불러오기 중 오류가 발생했습니다:', error);
            return [];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.scheduleManager = new ScheduleManager();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    document.getElementById('time').value = currentTime;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        scheduleManager.resetForm();
    }
});