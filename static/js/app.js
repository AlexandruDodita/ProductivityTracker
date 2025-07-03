/**
 * Main Application JavaScript
 * 
 * Handles form interactions, API communication, and coordinates between
 * the productivity calendar visualization and activity logging interface.
 * Manages state synchronization and user feedback for the productivity tracker.
 */

class ProductivityApp {
    constructor() {
        this.calendar = null;
        this.labels = {};
        this.todayActivities = [];
        this.currentDate = this.getCurrentDate();
        
        this.init();
    }
    
    /**
     * Initializes the application by setting up the calendar, loading initial data,
     * and configuring event listeners for user interactions.
     */
    async init() {
        try {
            // Initialize calendar heatmap
            this.initializeCalendar();
            
            // Load labels and productivity data
            await this.loadLabels();
            await this.loadProductivityData();
            
            // Setup form handlers and event listeners
            this.setupEventListeners();
            
            // Load today's activities
            await this.loadTodayData();
            
            console.log('Productivity app initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showMessage('Failed to initialize application', 'error');
        }
    }
    
    /**
     * Creates and configures the GitHub-like calendar heatmap visualization.
     * Sets up click handlers for date selection and day detail viewing.
     */
    initializeCalendar() {
        this.calendar = new CalendarHeatmap('calendar-grid', {
            cellSize: 11,
            cellGap: 3,
            showTooltip: true,
            showMonthLabels: true,
            showDayLabels: true
        });
        
        // Handle calendar cell clicks for date selection
        document.getElementById('calendar-grid').addEventListener('calendarCellClick', (event) => {
            this.handleCalendarDayClick(event.detail.date, event.detail.score);
        });
    }
    
    /**
     * Loads available activity labels from the API and populates the activity form dropdown.
     * Updates the internal labels mapping for productivity calculations.
     */
    async loadLabels() {
        try {
            const response = await fetch('/api/labels');
            const data = await response.json();
            
            if (data.success) {
                this.labels = data.labels;
                this.populateActivitySelect();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error loading labels:', error);
            this.showMessage('Failed to load activity labels', 'error');
        }
    }
    
    /**
     * Fetches productivity data from the API and renders it on the calendar.
     * Also updates statistics display with current productivity metrics.
     */
    async loadProductivityData() {
        try {
            const response = await fetch('/api/productivity-data');
            const data = await response.json();
            
            if (data.success) {
                // Render calendar with productivity data
                this.calendar.render(data.calendar_data);
                
                // Update statistics
                this.updateStatistics(data.stats);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error loading productivity data:', error);
            this.showMessage('Failed to load productivity data', 'error');
        }
    }
    
    /**
     * Loads today's productivity data and activities for the sidebar display.
     * Shows current daily progress and existing logged activities.
     */
    async loadTodayData() {
        try {
            const response = await fetch(`/api/day-details/${this.currentDate}`);
            const data = await response.json();
            
            if (data.success && data.entry) {
                this.todayActivities = data.entry.activities || [];
                this.updateTodayPanel(data.entry.total_score);
                this.updateActivityList();
            } else {
                this.todayActivities = [];
                this.updateTodayPanel(0);
                this.updateActivityList();
            }
        } catch (error) {
            console.error('Error loading today\'s data:', error);
        }
    }
    
    /**
     * Populates the activity type dropdown with available labels and their descriptions.
     * Displays productivity rates for user reference during activity logging.
     */
    populateActivitySelect() {
        const select = document.getElementById('activity-label');
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Select activity type...</option>';
        
        // Add options for each label
        Object.entries(this.labels).forEach(([name, data]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${data.productivity_rate}/min)`;
            select.appendChild(option);
        });
    }
    
    /**
     * Sets up event listeners for form submissions, button clicks, and other user interactions.
     * Configures the activity logging form and navigation elements.
     */
    setupEventListeners() {
        // Activity form submission
        const activityForm = document.getElementById('activity-form');
        if (activityForm) {
            activityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addActivity();
            });
        }
        
        // Date input change handler
        const dateInput = document.getElementById('activity-date');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadDayData(this.currentDate);
            });
        }
        
        // Initialize date input with today's date
        if (dateInput) {
            dateInput.value = this.currentDate;
        }
    }
    
    /**
     * Handles adding a new activity and immediately saves it to the backend.
     * Validates form input, adds to the list, and persists changes.
     */
    async addActivity() {
        const labelSelect = document.getElementById('activity-label');
        const durationInput = document.getElementById('activity-duration');
        
        if (!labelSelect || !durationInput) return;
        
        const label = labelSelect.value;
        const duration = parseFloat(durationInput.value);
        
        // Validate inputs
        if (!label) {
            this.showMessage('Please select an activity type', 'error');
            return;
        }
        
        if (!duration || duration <= 0) {
            this.showMessage('Please enter a valid duration', 'error');
            return;
        }
        
        // Add activity to the list
        const activity = {
            label: label,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        
        this.todayActivities.push(activity);
        
        // Update UI immediately
        this.updateActivityList();
        this.calculateAndUpdateTodayScore();
        
        // Clear form
        labelSelect.value = '';
        durationInput.value = '';
        
        // Save to backend immediately
        try {
            await this.saveActivitiesData();
            this.showMessage('Activity added and saved successfully!', 'success');
        } catch (error) {
            // If save fails, remove the activity that was just added
            this.todayActivities.pop();
            this.updateActivityList();
            this.calculateAndUpdateTodayScore();
            this.showMessage('Failed to save activity', 'error');
        }
    }
    
    /**
     * Removes an activity from today's activity list and immediately saves changes.
     * Recalculates the daily productivity score after removal.
     */
    async removeActivity(index) {
        if (index >= 0 && index < this.todayActivities.length) {
            // Store the removed activity for potential rollback
            const removedActivity = this.todayActivities[index];
            
            // Remove from local array
            this.todayActivities.splice(index, 1);
            this.updateActivityList();
            this.calculateAndUpdateTodayScore();
            
            // Save to backend immediately
            try {
                await this.saveActivitiesData();
                this.showMessage('Activity removed and saved successfully!', 'success');
            } catch (error) {
                // If save fails, restore the removed activity
                this.todayActivities.splice(index, 0, removedActivity);
                this.updateActivityList();
                this.calculateAndUpdateTodayScore();
                this.showMessage('Failed to remove activity', 'error');
            }
        }
    }
    
    /**
     * Saves the current day's activities to the server and updates the calendar.
     * Internal method used by addActivity() and removeActivity() for immediate persistence.
     */
    async saveActivitiesData() {
        const payload = {
            date: this.currentDate,
            activities: this.todayActivities
        };
        
        const response = await fetch('/api/save-productivity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update calendar with new data
            const newData = {};
            newData[this.currentDate] = data.entry.total_score;
            this.calendar.updateData(newData);
            
            // Reload statistics
            await this.loadProductivityData();
        } else {
            throw new Error(data.error || 'Failed to save activities');
        }
    }
    
    /**
     * Updates the activity list display in the sidebar with current activities.
     * Shows activity details and provides removal buttons for each entry.
     */
    updateActivityList() {
        const container = document.getElementById('activity-list');
        if (!container) return;
        
        if (this.todayActivities.length === 0) {
            container.innerHTML = '<p class="text-secondary">No activities logged yet.</p>';
            return;
        }
        
        container.innerHTML = this.todayActivities.map((activity, index) => {
            const labelData = this.labels[activity.label] || {};
            const score = activity.duration * (labelData.productivity_rate || 0);
            
            return `
                <div class="activity-item">
                    <div class="activity-info">
                        <div class="activity-label">${activity.label}</div>
                        <div class="activity-duration">${activity.duration} min • ${score.toFixed(1)} pts</div>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="app.removeActivity(${index})">
                        Remove
                    </button>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Calculates total productivity score for today's activities and updates the display.
     * Uses label productivity rates to compute the cumulative daily score.
     */
    calculateAndUpdateTodayScore() {
        let totalScore = 0;
        
        this.todayActivities.forEach(activity => {
            const labelData = this.labels[activity.label] || {};
            const rate = labelData.productivity_rate || 0;
            totalScore += activity.duration * rate;
        });
        
        this.updateTodayPanel(totalScore);
    }
    
    /**
     * Updates the today's productivity score panel with the current total.
     * Provides visual feedback on daily progress and achievement level.
     */
    updateTodayPanel(score) {
        const scoreElement = document.getElementById('today-score');
        if (scoreElement) {
            scoreElement.textContent = `${score.toFixed(1)} pts`;
            
            // Update color based on score level
            scoreElement.className = 'today-score';
            if (score >= 100) {
                scoreElement.classList.add('score-excellent');
            } else if (score >= 75) {
                scoreElement.classList.add('score-high');
            } else if (score >= 50) {
                scoreElement.classList.add('score-medium');
            } else if (score > 0) {
                scoreElement.classList.add('score-low');
            }
        }
    }
    
    /**
     * Updates the statistics panel with productivity metrics and insights.
     * Displays total days tracked, productive days, and average scores.
     */
    updateStatistics(stats) {
        const elements = {
            'total-days': stats.total_days,
            'productive-days': stats.productive_days,
            'max-score': stats.max_score.toFixed(1),
            'avg-score': stats.avg_score.toFixed(1)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    /**
     * Handles calendar day clicks by loading data for the selected date.
     * Allows users to view and edit activities for any day in the calendar.
     */
    async handleCalendarDayClick(date, score) {
        this.currentDate = date;
        
        // Update date input
        const dateInput = document.getElementById('activity-date');
        if (dateInput) {
            dateInput.value = date;
        }
        
        // Load data for the selected date
        await this.loadDayData(date);
        
        console.log(`Selected date: ${date} with score: ${score}`);
    }
    
    /**
     * Loads productivity data and activities for a specific date.
     * Updates the interface to show historical data for editing or viewing.
     */
    async loadDayData(date) {
        try {
            const response = await fetch(`/api/day-details/${date}`);
            const data = await response.json();
            
            if (data.success && data.entry) {
                this.todayActivities = data.entry.activities || [];
                this.updateTodayPanel(data.entry.total_score);
            } else {
                this.todayActivities = [];
                this.updateTodayPanel(0);
            }
            
            this.updateActivityList();
            
        } catch (error) {
            console.error('Error loading day data:', error);
            this.showMessage('Failed to load day data', 'error');
        }
    }
    
    /**
     * Displays user feedback messages with appropriate styling for success or error states.
     * Provides immediate visual feedback for user actions and system responses.
     */
    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}-message`;
        messageEl.textContent = message;
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(messageEl, mainContent.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
    
    /**
     * Gets the current date in YYYY-MM-DD format for form initialization.
     * Ensures consistent date formatting across the application.
     */
    getCurrentDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Initialize the application when the DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProductivityApp();
}); 