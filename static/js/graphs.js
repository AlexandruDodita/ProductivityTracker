/**
 * Productivity Graphs JavaScript
 * 
 * Handles chart creation, data loading, and visualization for the productivity
 * graph tracker. Integrates with Chart.js for professional analytics display.
 * Supports multiple chart types with dynamic theme switching.
 */

class ProductivityGraphs {
    constructor() {
        this.charts = {};
        this.currentTheme = 'light';
        this.currentPeriod = 30;
        this.trendView = 'daily'; // 'daily' or 'weekly'
        
        this.init();
    }
    
    /**
     * Initializes the graph application by setting up charts and event listeners.
     * Loads initial data and configures chart defaults for consistent styling.
     */
    async init() {
        try {
            // Set Chart.js defaults for better appearance
            this.configureChartDefaults();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Detect current theme
            this.currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            
            // Load initial data
            await this.loadAllData();
            
            console.log('Productivity graphs initialized successfully');
        } catch (error) {
            console.error('Error initializing graphs:', error);
            this.showMessage('Failed to initialize charts', 'error');
        }
    }
    
    /**
     * Configures Chart.js global defaults for consistent theme-aware styling.
     * Sets up responsive behavior and animation preferences.
     */
    configureChartDefaults() {
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.animation.duration = 750;
        Chart.defaults.plugins.legend.position = 'bottom';
        Chart.defaults.elements.point.borderWidth = 2;
        Chart.defaults.elements.point.hoverRadius = 8;
    }
    
    /**
     * Sets up event listeners for user interactions including time period changes,
     * data refresh, and trend view switching.
     */
    setupEventListeners() {
        // Time period selector
        const periodSelect = document.getElementById('time-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = parseInt(e.target.value);
                this.loadAllData();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAllData();
            });
        }
    }
    
    /**
     * Loads all chart data and renders visualizations.
     * Coordinates multiple API calls for comprehensive data display.
     */
    async loadAllData() {
        try {
            this.showLoading(true);
            
            // Load data in parallel for better performance
            const [statsData, trendData, activityData] = await Promise.all([
                this.fetchProductivityStats(),
                this.fetchTrendData(),
                this.fetchActivityBreakdown()
            ]);
            
            // Update statistics overview
            this.updateStatsOverview(statsData);
            
            // Create/update all charts
            this.createTrendChart(trendData);
            this.createActivityCharts(activityData);
            
            // Generate insights
            this.generateInsights(statsData, activityData);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showMessage('Failed to load chart data', 'error');
            this.showLoading(false);
        }
    }
    
    /**
     * Fetches productivity statistics from the API.
     */
    async fetchProductivityStats() {
        const response = await fetch(`/api/graph-data/productivity-stats?days=${this.currentPeriod}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        return data.data;
    }
    
    /**
     * Fetches trend data (daily or weekly) based on current view mode.
     */
    async fetchTrendData() {
        const endpoint = this.trendView === 'daily' 
            ? `/api/graph-data/daily-trend?days=${this.currentPeriod}`
            : `/api/graph-data/weekly-trend?weeks=${Math.ceil(this.currentPeriod / 7)}`;
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        return data.data;
    }
    
    /**
     * Fetches activity breakdown data for pie and bar charts.
     */
    async fetchActivityBreakdown() {
        const response = await fetch(`/api/graph-data/activity-breakdown?days=${this.currentPeriod}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        return data.data;
    }
    
    /**
     * Updates the statistics overview cards with current data.
     */
    updateStatsOverview(stats) {
        document.getElementById('total-days').textContent = stats.period_days;
        document.getElementById('productive-days').textContent = stats.productive_days;
        document.getElementById('avg-score').textContent = stats.avg_daily_score;
        
        // Update trend indicator
        const trendValue = document.getElementById('trend-value');
        const trendIcon = document.getElementById('trend-icon');
        
        trendValue.textContent = `${stats.trend_percentage}%`;
        
        if (stats.trend_percentage > 0) {
            trendIcon.textContent = '📈';
            trendValue.style.color = 'var(--success-color)';
        } else if (stats.trend_percentage < 0) {
            trendIcon.textContent = '📉';
            trendValue.style.color = 'var(--danger-color)';
        } else {
            trendIcon.textContent = '➡️';
            trendValue.style.color = 'var(--text-secondary)';
        }
    }
    
    /**
     * Creates or updates the productivity trend line chart.
     */
    createTrendChart(trendData) {
        const ctx = document.getElementById('trend-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.trendChart) {
            this.charts.trendChart.destroy();
        }
        
        const colors = this.getThemeColors();
        
        this.charts.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: `${this.trendView === 'daily' ? 'Daily' : 'Weekly'} Productivity Score`,
                    data: trendData.scores,
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryAlpha,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: colors.primary,
                    pointBorderColor: colors.background,
                    pointHoverBackgroundColor: colors.accent,
                    pointHoverBorderColor: colors.primary
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.card,
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: colors.border
                        },
                        ticks: {
                            color: colors.textSecondary
                        }
                    },
                    x: {
                        grid: {
                            color: colors.border
                        },
                        ticks: {
                            color: colors.textSecondary
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Creates activity distribution pie charts and performance bar chart.
     */
    createActivityCharts(activityData) {
        this.createTimePieChart(activityData);
        this.createScorePieChart(activityData);
        this.createActivityBarChart(activityData);
    }
    
    /**
     * Creates the time distribution pie chart.
     */
    createTimePieChart(activityData) {
        const ctx = document.getElementById('time-pie-chart').getContext('2d');
        
        if (this.charts.timePieChart) {
            this.charts.timePieChart.destroy();
        }
        
        const colors = this.getThemeColors();
        
        this.charts.timePieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: activityData.labels,
                datasets: [{
                    data: activityData.time_data,
                    backgroundColor: activityData.colors,
                    borderColor: colors.background,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.card,
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} min (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Creates the score distribution pie chart.
     */
    createScorePieChart(activityData) {
        const ctx = document.getElementById('score-pie-chart').getContext('2d');
        
        if (this.charts.scorePieChart) {
            this.charts.scorePieChart.destroy();
        }
        
        const colors = this.getThemeColors();
        
        this.charts.scorePieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: activityData.labels,
                datasets: [{
                    data: activityData.score_data,
                    backgroundColor: activityData.colors,
                    borderColor: colors.background,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.card,
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} pts (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Creates the activity performance comparison bar chart.
     */
    createActivityBarChart(activityData) {
        const ctx = document.getElementById('activity-bar-chart').getContext('2d');
        
        if (this.charts.activityBarChart) {
            this.charts.activityBarChart.destroy();
        }
        
        const colors = this.getThemeColors();
        
        this.charts.activityBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: activityData.labels,
                datasets: [
                    {
                        label: 'Time (minutes)',
                        data: activityData.time_data,
                        backgroundColor: colors.primaryAlpha,
                        borderColor: colors.primary,
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Score (points)',
                        data: activityData.score_data,
                        backgroundColor: colors.accentAlpha,
                        borderColor: colors.accent,
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        }
                    },
                    tooltip: {
                        backgroundColor: colors.card,
                        titleColor: colors.text,
                        bodyColor: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: colors.border
                        },
                        ticks: {
                            color: colors.textSecondary
                        },
                        title: {
                            display: true,
                            text: 'Time (minutes)',
                            color: colors.text
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: colors.textSecondary
                        },
                        title: {
                            display: true,
                            text: 'Score (points)',
                            color: colors.text
                        }
                    },
                    x: {
                        grid: {
                            color: colors.border
                        },
                        ticks: {
                            color: colors.textSecondary
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Switches between daily and weekly trend views.
     */
    async switchTrendView(view) {
        this.trendView = view;
        
        // Update button states
        document.getElementById('daily-btn').className = view === 'daily' ? 'btn btn-small' : 'btn btn-small btn-secondary';
        document.getElementById('weekly-btn').className = view === 'weekly' ? 'btn btn-small' : 'btn btn-small btn-secondary';
        
        // Reload trend data
        try {
            const trendData = await this.fetchTrendData();
            this.createTrendChart(trendData);
        } catch (error) {
            console.error('Error switching trend view:', error);
            this.showMessage('Failed to update trend chart', 'error');
        }
    }
    
    /**
     * Generates productivity insights based on current data.
     */
    generateInsights(stats, activityData) {
        const insights = [];
        
        // Productivity rate insight
        const productivityRate = stats.productivity_rate;
        if (productivityRate >= 80) {
            insights.push('🔥 Excellent consistency! You\'re productive on most days.');
        } else if (productivityRate >= 60) {
            insights.push('👍 Good momentum! Try to increase consistency for better results.');
        } else {
            insights.push('💪 Focus on building daily habits for more consistent productivity.');
        }
        
        // Trend insight
        if (stats.trend_percentage > 10) {
            insights.push('📈 Strong upward trend! Your productivity is significantly improving.');
        } else if (stats.trend_percentage > 0) {
            insights.push('📊 Positive trend detected. Keep up the good work!');
        } else if (stats.trend_percentage < -10) {
            insights.push('⚠️ Declining trend. Consider reviewing your current strategies.');
        }
        
        // Activity balance insight
        if (activityData.labels.length > 0) {
            const maxTimeActivity = activityData.labels[activityData.time_data.indexOf(Math.max(...activityData.time_data))];
            const maxScoreActivity = activityData.labels[activityData.score_data.indexOf(Math.max(...activityData.score_data))];
            
            if (maxTimeActivity === maxScoreActivity) {
                insights.push(`⭐ Great focus! Most time spent on "${maxTimeActivity}" is also your highest scoring activity.`);
            } else {
                insights.push(`🎯 Consider allocating more time to "${maxScoreActivity}" for better productivity scores.`);
            }
        }
        
        // Average score insight
        if (stats.avg_daily_score >= 100) {
            insights.push('🏆 Outstanding daily averages! You\'re exceeding optimal productivity levels.');
        } else if (stats.avg_daily_score >= 50) {
            insights.push('✅ Solid daily averages. You\'re on track for good productivity.');
        } else {
            insights.push('📝 Consider increasing high-value activities to boost your daily averages.');
        }
        
        // Display insights
        const insightsContainer = document.getElementById('insights-content');
        if (insightsContainer) {
            insightsContainer.innerHTML = insights.map(insight => 
                `<div class="insight-item">${insight}</div>`
            ).join('');
        }
    }
    
    /**
     * Updates chart themes when the user switches between light and dark mode.
     */
    updateChartThemes() {
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        // Recreate all charts with new theme colors
        if (Object.keys(this.charts).length > 0) {
            this.loadAllData();
        }
    }
    
    /**
     * Returns theme-appropriate colors for chart styling.
     */
    getThemeColors() {
        const isDark = this.currentTheme === 'dark';
        
        return {
            primary: isDark ? '#58a6ff' : '#0366d6',
            primaryAlpha: isDark ? 'rgba(88, 166, 255, 0.2)' : 'rgba(3, 102, 214, 0.2)',
            accent: isDark ? '#3fb950' : '#28a745',
            accentAlpha: isDark ? 'rgba(63, 185, 80, 0.2)' : 'rgba(40, 167, 69, 0.2)',
            text: isDark ? '#e6edf3' : '#24292e',
            textSecondary: isDark ? '#8b949e' : '#586069',
            background: isDark ? '#0d1117' : '#ffffff',
            card: isDark ? '#21262d' : '#ffffff',
            border: isDark ? '#30363d' : '#e1e4e8'
        };
    }
    
    /**
     * Shows/hides loading state for the charts.
     */
    showLoading(show) {
        // Implementation would depend on your loading UI design
        const containers = document.querySelectorAll('.chart-wrapper');
        containers.forEach(container => {
            if (show) {
                container.style.opacity = '0.5';
            } else {
                container.style.opacity = '1';
            }
        });
    }
    
    /**
     * Displays user feedback messages.
     */
    showMessage(message, type = 'info') {
        // Simple implementation - you might want to use a more sophisticated notification system
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // You could add a toast notification here
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize the graphs app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.graphApp = new ProductivityGraphs();
}); 