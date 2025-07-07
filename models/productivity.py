import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


class ProductivityTracker:
    """
    Core productivity data management class that handles loading, saving, and processing
    of daily productivity scores. Manages the integration between user activities and
    their corresponding productivity ratings.
    """
    
    def __init__(self, data_file: str = 'data/productivity.json', label_manager=None):
        self.data_file = data_file
        self.productivity_data = {}
        self.label_manager = label_manager
        self.load_data()
    
    def load_data(self) -> None:
        """
        Loads productivity data from JSON file storage, creating empty structure if file doesn't exist.
        Initializes the productivity_data dictionary with historical entries.
        """
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r') as f:
                    self.productivity_data = json.load(f)
            else:
                self.productivity_data = {}
                self._ensure_data_directory()
        except (json.JSONDecodeError, IOError):
            self.productivity_data = {}
            self._ensure_data_directory()
    
    def _ensure_data_directory(self) -> None:
        """Ensures the data directory exists for JSON file storage."""
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
    
    def save_productivity_entry(self, date: str, activities: List[Dict[str, any]]) -> bool:
        """
        Saves a daily productivity entry with calculated total score based on activities and their durations.
        Validates input data and calculates productivity score using label ratings.
        
        Args:
            date: ISO format date string (YYYY-MM-DD)
            activities: List of activity dictionaries with label, duration, and other metadata
            
        Returns:
            Boolean indicating successful save operation
        """
        try:
            # Calculate total productivity score for the day
            total_score = self._calculate_daily_score(activities)
            
            # Store the entry with both activities and calculated score
            self.productivity_data[date] = {
                'activities': activities,
                'total_score': total_score,
                'timestamp': datetime.now().isoformat()
            }
            
            # Persist to JSON file
            self._save_to_file()
            return True
            
        except Exception as e:
            print(f"Error saving productivity entry: {e}")
            return False
    
    def _calculate_daily_score(self, activities: List[Dict[str, any]]) -> float:
        """
        Calculates total daily productivity score based on activities and their associated label ratings.
        Uses the LabelManager to get productivity rates per minute for each activity type.
        """
        # Use the shared label_manager instance, or create a new one if not available
        if self.label_manager is None:
            self.label_manager = LabelManager()
            
        total_score = 0.0
        
        for activity in activities:
            label = activity.get('label', '')
            duration = float(activity.get('duration', 0))  # duration in minutes
            
            # Get productivity rate for this label (points per minute)
            label_data = self.label_manager.get_label(label)
            if label_data:
                rate = label_data.get('productivity_rate', 0)
                total_score += duration * rate
        
        return round(total_score, 2)
    
    def get_calendar_data(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, float]:
        """
        Formats productivity data for GitHub-like calendar visualization.
        Returns dictionary mapping date strings to productivity scores for the specified date range.
        
        Args:
            start_date: Optional start date filter (YYYY-MM-DD)
            end_date: Optional end date filter (YYYY-MM-DD)
            
        Returns:
            Dictionary mapping date strings to productivity scores
        """
        calendar_data = {}
        
        # If no date range specified, use last 365 days and extend to future
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not end_date:
            # Allow future dates to be displayed (extend 30 days into future)
            end_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Filter and format data for the specified range
        for date_str, entry in self.productivity_data.items():
            if start_date <= date_str <= end_date:
                calendar_data[date_str] = entry.get('total_score', 0)
        
        return calendar_data
    
    def get_productivity_entry(self, date: str) -> Optional[Dict]:
        """Retrieves productivity entry for a specific date."""
        return self.productivity_data.get(date)
    
    def get_daily_trend_data(self, days: int = 30) -> Dict[str, List]:
        """
        Provides daily productivity trend data for line charts.
        Returns data for the specified number of recent days.
        
        Args:
            days: Number of recent days to include in the trend
            
        Returns:
            Dictionary with dates and scores arrays for chart visualization
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        
        dates = []
        scores = []
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            dates.append(date_str)
            
            entry = self.productivity_data.get(date_str)
            score = entry.get('total_score', 0) if entry else 0
            scores.append(score)
            
            current_date += timedelta(days=1)
        
        return {
            'dates': dates,
            'scores': scores,
            'labels': [datetime.strptime(d, '%Y-%m-%d').strftime('%m/%d') for d in dates]
        }
    
    def get_weekly_trend_data(self, weeks: int = 12) -> Dict[str, List]:
        """
        Provides weekly productivity trend data aggregated from daily scores.
        Returns data for the specified number of recent weeks.
        """
        end_date = datetime.now()
        
        weeks_data = []
        labels = []
        
        for week_offset in range(weeks-1, -1, -1):
            week_start = end_date - timedelta(days=end_date.weekday() + (week_offset * 7))
            week_end = week_start + timedelta(days=6)
            
            # Calculate total score for the week
            week_score = 0.0
            for day_offset in range(7):
                day_date = week_start + timedelta(days=day_offset)
                date_str = day_date.strftime('%Y-%m-%d')
                entry = self.productivity_data.get(date_str)
                if entry:
                    week_score += entry.get('total_score', 0)
            
            weeks_data.append(round(week_score, 2))
            labels.append(f"{week_start.strftime('%m/%d')}")
        
        return {
            'weeks': list(range(1, weeks+1)),
            'scores': weeks_data,
            'labels': labels
        }
    
    def get_activity_breakdown_data(self, days: int = 30) -> Dict[str, any]:
        """
        Provides activity breakdown data for pie charts and bar charts.
        Analyzes time spent and productivity by activity type.
        
        Args:
            days: Number of recent days to analyze
            
        Returns:
            Dictionary with activity statistics for visualization
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        
        activity_stats = {}
        
        # Analyze each day in the range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            entry = self.productivity_data.get(date_str)
            
            if entry and 'activities' in entry:
                for activity in entry['activities']:
                    label = activity.get('label', 'Unknown')
                    duration = float(activity.get('duration', 0))
                    
                    if label not in activity_stats:
                        activity_stats[label] = {
                            'total_time': 0,
                            'total_score': 0,
                            'activity_count': 0
                        }
                    
                    activity_stats[label]['total_time'] += duration
                    activity_stats[label]['activity_count'] += 1
                    
                    # Calculate score contribution
                    if self.label_manager:
                        label_data = self.label_manager.get_label(label)
                        if label_data:
                            rate = label_data.get('productivity_rate', 0)
                            activity_stats[label]['total_score'] += duration * rate
            
            current_date += timedelta(days=1)
        
        # Format data for charts
        labels = list(activity_stats.keys())
        time_data = [round(activity_stats[label]['total_time'], 2) for label in labels]
        score_data = [round(activity_stats[label]['total_score'], 2) for label in labels]
        
        # Get colors from label manager
        colors = []
        if self.label_manager:
            for label in labels:
                label_data = self.label_manager.get_label(label)
                color = label_data.get('color', '#26d653') if label_data else '#26d653'
                colors.append(color)
        else:
            colors = ['#26d653'] * len(labels)
        
        return {
            'labels': labels,
            'time_data': time_data,
            'score_data': score_data,
            'colors': colors,
            'total_time': sum(time_data),
            'total_score': sum(score_data)
        }
    
    def get_productivity_stats(self, days: int = 30) -> Dict[str, any]:
        """
        Provides comprehensive productivity statistics for dashboard display.
        Includes trends, averages, and performance metrics.
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days-1)
        
        daily_scores = []
        productive_days = 0
        total_activities = 0
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            entry = self.productivity_data.get(date_str)
            
            if entry:
                score = entry.get('total_score', 0)
                daily_scores.append(score)
                if score > 0:
                    productive_days += 1
                
                activities = entry.get('activities', [])
                total_activities += len(activities)
            else:
                daily_scores.append(0)
            
            current_date += timedelta(days=1)
        
        # Calculate statistics
        avg_score = sum(daily_scores) / len(daily_scores) if daily_scores else 0
        max_score = max(daily_scores) if daily_scores else 0
        min_score = min(daily_scores) if daily_scores else 0
        
        # Calculate trend (simple slope of last 7 days vs previous 7 days)
        trend = 0
        if len(daily_scores) >= 14:
            recent_avg = sum(daily_scores[-7:]) / 7
            previous_avg = sum(daily_scores[-14:-7]) / 7
            trend = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0
        
        return {
            'period_days': days,
            'productive_days': productive_days,
            'productivity_rate': (productive_days / days * 100) if days > 0 else 0,
            'avg_daily_score': round(avg_score, 2),
            'max_daily_score': round(max_score, 2),
            'min_daily_score': round(min_score, 2),
            'total_score': round(sum(daily_scores), 2),
            'total_activities': total_activities,
            'trend_percentage': round(trend, 1),
            'daily_scores': daily_scores
        }
    
    def _save_to_file(self) -> None:
        """Persists current productivity data to JSON file."""
        self._ensure_data_directory()
        with open(self.data_file, 'w') as f:
            json.dump(self.productivity_data, f, indent=2)


class LabelManager:
    """
    Manages user-defined activity labels and their associated productivity ratings.
    Handles CRUD operations for activity types and their productivity rates per minute.
    """
    
    def __init__(self, labels_file: str = 'data/labels.json'):
        self.labels_file = labels_file
        self.labels = {}
        self.load_labels()
    
    def load_labels(self) -> None:
        """
        Loads activity labels and their configurations from JSON storage.
        Creates default labels if no configuration exists.
        """
        try:
            if os.path.exists(self.labels_file):
                with open(self.labels_file, 'r') as f:
                    self.labels = json.load(f)
            else:
                # Create default labels for new installations
                self._create_default_labels()
        except (json.JSONDecodeError, IOError):
            self._create_default_labels()
    
    def _create_default_labels(self) -> None:
        """Creates a set of default activity labels with standard productivity ratings."""
        default_labels = {
            'Deep Work': {
                'productivity_rate': 2.0,  # 2 points per minute
                'description': 'Focused, high-concentration work',
                'color': '#196127'
            },
            'Learning': {
                'productivity_rate': 1.5,
                'description': 'Educational activities and skill development',
                'color': '#239a3b'
            },
            'Planning': {
                'productivity_rate': 1.0,
                'description': 'Strategic planning and organization',
                'color': '#26d653'
            },
            'Communication': {
                'productivity_rate': 0.8,
                'description': 'Meetings, emails, and team collaboration',
                'color': '#40c463'
            },
            'Administrative': {
                'productivity_rate': 0.5,
                'description': 'Routine administrative tasks',
                'color': '#9be9a8'
            },
            'Break': {
                'productivity_rate': 0.0,
                'description': 'Rest and recovery time',
                'color': '#ebedf0'
            }
        }
        
        self.labels = default_labels
        self._save_labels()
    
    def add_label(self, name: str, productivity_rate: float, description: str = '', color: str = '#26d653') -> bool:
        """
        Creates a new activity label with specified productivity rate and configuration.
        
        Args:
            name: Unique name for the activity label
            productivity_rate: Productivity points earned per minute for this activity
            description: Optional description of the activity type
            color: Hex color code for visual representation
            
        Returns:
            Boolean indicating successful creation
        """
        try:
            if name in self.labels:
                return False  # Label already exists
            
            self.labels[name] = {
                'productivity_rate': float(productivity_rate),
                'description': description,
                'color': color
            }
            
            self._save_labels()
            return True
            
        except Exception as e:
            print(f"Error adding label: {e}")
            return False
    
    def update_label(self, name: str, productivity_rate: Optional[float] = None, 
                    description: Optional[str] = None, color: Optional[str] = None) -> bool:
        """
        Updates an existing activity label's configuration.
        Only modifies specified parameters, leaving others unchanged.
        """
        try:
            if name not in self.labels:
                return False
            
            if productivity_rate is not None:
                self.labels[name]['productivity_rate'] = float(productivity_rate)
            if description is not None:
                self.labels[name]['description'] = description
            if color is not None:
                self.labels[name]['color'] = color
            
            self._save_labels()
            return True
            
        except Exception as e:
            print(f"Error updating label: {e}")
            return False
    
    def delete_label(self, name: str) -> bool:
        """Removes an activity label from the system."""
        try:
            if name in self.labels:
                del self.labels[name]
                self._save_labels()
                return True
            return False
        except Exception as e:
            print(f"Error deleting label: {e}")
            return False
    
    def get_label(self, name: str) -> Optional[Dict]:
        """Retrieves configuration for a specific activity label."""
        return self.labels.get(name)
    
    def get_all_labels(self) -> Dict[str, Dict]:
        """Returns all configured activity labels and their settings."""
        return self.labels.copy()
    
    def _save_labels(self) -> None:
        """Persists current label configuration to JSON file."""
        os.makedirs(os.path.dirname(self.labels_file), exist_ok=True)
        with open(self.labels_file, 'w') as f:
            json.dump(self.labels, f, indent=2) 