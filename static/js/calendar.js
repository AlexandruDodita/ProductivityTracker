/**
 * CalendarHeatmap - GitHub-style productivity calendar visualization
 * 
 * Renders an interactive SVG-based calendar grid that displays productivity scores
 * as color-coded cells. Supports hover interactions, click handlers, and dynamic
 * data updates for real-time productivity tracking visualization.
 */
class CalendarHeatmap {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            cellSize: 11,
            cellGap: 3,
            weekStart: 0, // 0 = Sunday, 1 = Monday
            maxLevel: 4,
            colorLevels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39', '#0d4d1c'],
            showTooltip: true,
            showMonthLabels: true,
            showDayLabels: true,
            ...options
        };
        
        this.data = {};
        this.tooltip = null;
        this.svg = null;
        this.currentYear = new Date().getFullYear();
        
        this.init();
    }
    
    /**
     * Initializes the calendar heatmap by creating the SVG container and setting up event listeners.
     * Prepares the visualization structure for rendering productivity data.
     */
    init() {
        this.createTooltip();
        this.createSVG();
        this.setupEventListeners();
    }
    
    /**
     * Creates the main SVG element with proper dimensions calculated from cell count and spacing.
     * Establishes the coordinate system for positioning calendar cells and labels.
     */
    createSVG() {
        // Calculate dimensions
        const weeks = 53; // Maximum weeks in a year
        const days = 7;
        const cellSize = this.options.cellSize;
        const cellGap = this.options.cellGap;
        
        const width = weeks * (cellSize + cellGap) + 80; // Extra space for labels
        const height = days * (cellSize + cellGap) + 40; // Extra space for month labels
        
        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('class', 'calendar-svg');
        
        // Clear container and add SVG
        this.container.innerHTML = '';
        this.container.appendChild(this.svg);
    }
    
    /**
     * Creates a floating tooltip element for displaying detailed productivity information
     * when users hover over calendar cells.
     */
    createTooltip() {
        if (!this.options.showTooltip) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'calendar-tooltip';
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * Sets up global event listeners for tooltip hiding when mouse leaves the calendar area.
     * Manages tooltip visibility and positioning during user interactions.
     */
    setupEventListeners() {
        if (this.tooltip) {
            // Hide tooltip when mouse leaves the container
            this.container.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        }
    }
    
    /**
     * Renders the complete calendar grid with data visualization for the specified year.
     * Creates all calendar cells, labels, and applies productivity data coloring.
     * 
     * @param {Object} data - Productivity data mapping dates to scores
     * @param {number} year - Year to render (defaults to current year)
     */
    render(data = {}, year = this.currentYear) {
        this.data = data;
        this.currentYear = year;
        
        // Clear existing content
        this.svg.innerHTML = '';
        
        // Render calendar components
        this.renderMonthLabels();
        this.renderDayLabels();
        this.renderCalendarCells();
    }
    
    /**
     * Creates month label elements positioned above the calendar grid.
     * Calculates proper positioning based on the first week of each month.
     */
    renderMonthLabels() {
        if (!this.options.showMonthLabels) return;
        
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        const cellSize = this.options.cellSize;
        const cellGap = this.options.cellGap;
        const startX = 30; // Offset for day labels
        
        // Calculate month positions
        for (let month = 0; month < 12; month++) {
            const firstDay = new Date(this.currentYear, month, 1);
            const weekIndex = this.getWeekOfYear(firstDay);
            
            if (weekIndex >= 0 && weekIndex < 53) {
                const x = startX + weekIndex * (cellSize + cellGap);
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', 10);
                text.setAttribute('class', 'month-label');
                text.textContent = months[month];
                
                this.svg.appendChild(text);
            }
        }
    }
    
    /**
     * Creates day-of-week labels positioned to the left of the calendar grid.
     * Shows abbreviated day names for visual reference.
     */
    renderDayLabels() {
        if (!this.options.showDayLabels) return;
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const cellSize = this.options.cellSize;
        const cellGap = this.options.cellGap;
        const startY = 25; // Offset for month labels
        
        // Show only Mon, Wed, Fri to avoid clutter
        const visibleDays = [1, 3, 5];
        
        visibleDays.forEach(dayIndex => {
            const y = startY + dayIndex * (cellSize + cellGap) + cellSize / 2;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 25);
            text.setAttribute('y', y);
            text.setAttribute('class', 'day-label');
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('alignment-baseline', 'middle');
            text.textContent = days[dayIndex];
            
            this.svg.appendChild(text);
        });
    }
    
    /**
     * Generates the main calendar cell grid representing each day of the year.
     * Applies productivity score coloring and interactive hover/click behaviors.
     */
    renderCalendarCells() {
        const cellSize = this.options.cellSize;
        const cellGap = this.options.cellGap;
        const startX = 30; // Offset for day labels
        const startY = 25; // Offset for month labels
        
        // Generate all days of the year
        const startDate = new Date(this.currentYear, 0, 1);
        const endDate = new Date(this.currentYear, 11, 31);
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = this.formatDate(currentDate);
            const weekIndex = this.getWeekOfYear(currentDate);
                        const dayOfWeek = currentDate.getDay();
            
            // Calculate position
            const x = startX + weekIndex * (cellSize + cellGap);
            const y = startY + dayOfWeek * (cellSize + cellGap);
            
            // Get productivity data for this date
            const score = this.data[dateStr] || 0;
            const level = this.getScoreLevel(score);
            
            // Create cell rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', cellSize);
            rect.setAttribute('height', cellSize);
            rect.setAttribute('rx', 2);
            rect.setAttribute('class', `calendar-cell level-${level}`);
            rect.setAttribute('data-date', dateStr);
            rect.setAttribute('data-score', score);
            
            // Add event listeners
            this.addCellEventListeners(rect, dateStr, score);
            
            this.svg.appendChild(rect);
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    /**
     * Attaches hover and click event listeners to individual calendar cells.
     * Manages tooltip display and cell interaction callbacks.
     * 
     * @param {SVGElement} cell - The calendar cell element
     * @param {string} date - Date string for the cell
     * @param {number} score - Productivity score for the date
     */
    addCellEventListeners(cell, date, score) {
        // Hover events for tooltip
        if (this.tooltip) {
            cell.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, date, score);
            });
            
            cell.addEventListener('mousemove', (e) => {
                this.positionTooltip(e);
            });
            
            cell.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        }
        
        // Click event for detailed view
        cell.addEventListener('click', () => {
            this.handleCellClick(date, score);
        });
    }
    
    /**
     * Displays the tooltip with productivity information for the hovered cell.
     * Formats the content to show date, score, and contextual details.
     */
    showTooltip(event, date, score) {
        if (!this.tooltip) return;
        
        const formattedDate = this.formatDateForTooltip(date);
        let content = `${formattedDate}`;
        
        if (score > 0) {
            content += `<br>Productivity: ${score} points`;
            content += `<br>${this.getScoreDescription(score)}`;
        } else {
            content += `<br>No productivity data`;
        }
        
        this.tooltip.innerHTML = content;
        this.tooltip.classList.add('visible');
        this.positionTooltip(event);
    }
    
    /**
     * Updates tooltip position based on mouse coordinates with boundary detection.
     * Ensures tooltip stays within viewport bounds for optimal user experience.
     */
    positionTooltip(event) {
        if (!this.tooltip) return;
        
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = event.clientX + 10;
        let y = event.clientY - 10;
        
        // Adjust position if tooltip would go off-screen
        if (x + tooltipRect.width > viewportWidth) {
            x = event.clientX - tooltipRect.width - 10;
        }
        
        if (y < 0) {
            y = event.clientY + 20;
        }
        
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }
    
    /**
     * Hides the tooltip by removing its visible class and clearing content.
     * Called when mouse leaves calendar cells or container area.
     */
    hideTooltip() {
        if (!this.tooltip) return;
        
        this.tooltip.classList.remove('visible');
    }
    
    /**
     * Handles click events on calendar cells for detailed day view or editing.
     * Can be overridden to provide custom click behavior for specific applications.
     * 
     * @param {string} date - The clicked date in YYYY-MM-DD format
     * @param {number} score - The productivity score for the clicked date
     */
    handleCellClick(date, score) {
        // Default implementation - can be overridden
        console.log(`Clicked on ${date} with score ${score}`);
        
        // Trigger custom event for external handling
        const event = new CustomEvent('calendarCellClick', {
            detail: { date, score }
        });
        this.container.dispatchEvent(event);
    }
    
    /**
     * Converts a numeric productivity score into a color intensity level (0-5).
     * Maps scores to visual intensity with special handling for scores over 100.
     * 
     * @param {number} score - The productivity score to convert
     * @returns {number} Color level from 0 (no activity) to 5 (maximum intensity)
     */
    getScoreLevel(score) {
        if (score === 0) return 0;
        if (score <= 25) return 1;
        if (score <= 50) return 2;
        if (score <= 75) return 3;
        if (score <= 100) return 4;
        return 5; // 100+ gets maximum intensity
    }
    
    /**
     * Provides descriptive text for productivity score ranges.
     * Used in tooltips and other UI elements to give context to numeric scores.
     */
    getScoreDescription(score) {
        if (score === 0) return 'No activity';
        if (score <= 25) return 'Light productivity';
        if (score <= 50) return 'Moderate productivity';
        if (score <= 75) return 'High productivity';
        if (score <= 100) return 'Very high productivity';
        return 'Maximum productivity!';
    }
    
    /**
     * Calculates the week number of the year for a given date.
     * Uses GitHub-style week numbering where weeks start on Sunday.
     * Ensures Saturday and Sunday are always in the same week column.
     */
    getWeekOfYear(date) {
        const year = date.getFullYear();
        const jan1 = new Date(year, 0, 1);
        
        // Find the Sunday that starts the week containing this date
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - date.getDay()); // Go back to Sunday of this week
        
        // Find the Sunday that starts the week containing January 1st
        const jan1Sunday = new Date(jan1);
        jan1Sunday.setDate(jan1.getDate() - jan1.getDay()); // Go back to Sunday of Jan 1st week
        
        // Calculate weeks between the two Sundays
        const daysBetween = Math.floor((sunday - jan1Sunday) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.floor(daysBetween / 7);
        
        return weekNumber;
    }
    
    /**
     * Formats a Date object into YYYY-MM-DD string format for data storage and retrieval.
     * Ensures consistent date string formatting across the application.
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Formats a date string for display in tooltips with user-friendly format.
     * Converts YYYY-MM-DD to more readable format like "January 15, 2024".
     */
    formatDateForTooltip(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Updates the calendar with new productivity data without full re-render.
     * Efficiently updates cell colors and data attributes for real-time updates.
     * 
     * @param {Object} newData - Updated productivity data mapping dates to scores
     */
    updateData(newData) {
        this.data = { ...this.data, ...newData };
        
        // Update existing cells
        const cells = this.svg.querySelectorAll('.calendar-cell');
        cells.forEach(cell => {
            const date = cell.getAttribute('data-date');
            const score = this.data[date] || 0;
            const level = this.getScoreLevel(score);
            
            // Update cell attributes and class
            cell.setAttribute('data-score', score);
            cell.setAttribute('class', `calendar-cell level-${level}`);
        });
    }
    
    /**
     * Destroys the calendar instance and cleans up event listeners and DOM elements.
     * Should be called when the calendar is no longer needed to prevent memory leaks.
     */
    destroy() {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.data = {};
        this.svg = null;
    }
} 