from flask import Flask, render_template, request, jsonify, redirect, url_for
from datetime import datetime, timedelta
import json
from models.productivity import ProductivityTracker, LabelManager


class ProductivityApp:
    """
    Main Flask application controller that manages routes and coordinates data flow
    between the frontend interface and backend productivity tracking logic.
    Handles user interactions for logging activities, viewing calendar data, and managing labels.
    """
    
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = 'productivity_tracker_secret_key_change_in_production'
        self.label_manager = LabelManager()
        self.productivity_tracker = ProductivityTracker(label_manager=self.label_manager)
        self._register_routes()
    
    def _register_routes(self):
        """Registers all Flask routes with their corresponding handler methods."""
        self.app.route('/', methods=['GET'])(self.index)
        self.app.route('/api/productivity-data', methods=['GET'])(self.get_productivity_data)
        self.app.route('/api/save-productivity', methods=['POST'])(self.save_productivity)
        self.app.route('/api/day-details/<date>', methods=['GET'])(self.get_day_details)
        self.app.route('/labels', methods=['GET'])(self.manage_labels)
        self.app.route('/api/labels', methods=['GET'])(self.get_labels_api)
        self.app.route('/api/labels', methods=['POST'])(self.create_label)
        self.app.route('/api/labels/<label_name>', methods=['PUT'])(self.update_label)
        self.app.route('/api/labels/<label_name>', methods=['DELETE'])(self.delete_label)
    
    def index(self):
        """
        Renders the main dashboard with productivity calendar display and activity entry forms.
        Provides the primary interface for users to view their productivity patterns and log new activities.
        """
        return render_template('index.html')
    
    def get_productivity_data(self):
        """
        API endpoint that returns JSON productivity data formatted for the GitHub-like calendar visualization.
        Supports optional date range filtering via query parameters for flexible calendar views.
        """
        try:
            # Get optional date range parameters
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            # Retrieve formatted calendar data
            calendar_data = self.productivity_tracker.get_calendar_data(start_date, end_date)
            
            # Calculate statistics for the frontend
            scores = list(calendar_data.values())
            stats = {
                'total_days': len(scores),
                'productive_days': len([s for s in scores if s > 0]),
                'max_score': max(scores) if scores else 0,
                'avg_score': sum(scores) / len(scores) if scores else 0
            }
            
            return jsonify({
                'calendar_data': calendar_data,
                'stats': stats,
                'success': True
            })
            
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def save_productivity(self):
        """
        API endpoint for saving daily productivity entries with activity logging.
        Processes submitted activities, calculates productivity scores, and updates the calendar data.
        """
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data or 'date' not in data or 'activities' not in data:
                return jsonify({
                    'error': 'Missing required fields: date and activities',
                    'success': False
                }), 400
            
            date = data['date']
            activities = data['activities']
            
            # Validate date format
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'error': 'Invalid date format. Use YYYY-MM-DD',
                    'success': False
                }), 400
            
            # Save the productivity entry
            success = self.productivity_tracker.save_productivity_entry(date, activities)
            
            if success:
                # Return updated entry data
                entry = self.productivity_tracker.get_productivity_entry(date)
                return jsonify({
                    'message': 'Productivity entry saved successfully',
                    'entry': entry,
                    'success': True
                })
            else:
                return jsonify({
                    'error': 'Failed to save productivity entry',
                    'success': False
                }), 500
                
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def get_day_details(self, date):
        """
        API endpoint that retrieves detailed productivity information for a specific date.
        Returns activity breakdown, total scores, and other metrics for calendar day interactions.
        """
        try:
            entry = self.productivity_tracker.get_productivity_entry(date)
            
            if entry:
                return jsonify({
                    'date': date,
                    'entry': entry,
                    'success': True
                })
            else:
                return jsonify({
                    'date': date,
                    'entry': None,
                    'message': 'No data found for this date',
                    'success': True
                })
                
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def manage_labels(self):
        """
        Renders the label management interface for configuring activity types and productivity rates.
        Provides CRUD functionality for users to customize their activity categories.
        """
        return render_template('labels.html')
    
    def get_labels_api(self):
        """API endpoint that returns all configured activity labels and their settings."""
        try:
            labels = self.label_manager.get_all_labels()
            return jsonify({
                'labels': labels,
                'success': True
            })
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def create_label(self):
        """API endpoint for creating new activity labels with productivity rates."""
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['name', 'productivity_rate']
            if not data or not all(field in data for field in required_fields):
                return jsonify({
                    'error': f'Missing required fields: {", ".join(required_fields)}',
                    'success': False
                }), 400
            
            name = data['name']
            productivity_rate = float(data['productivity_rate'])
            description = data.get('description', '')
            color = data.get('color', '#26d653')
            
            success = self.label_manager.add_label(name, productivity_rate, description, color)
            
            if success:
                return jsonify({
                    'message': f'Label "{name}" created successfully',
                    'success': True
                })
            else:
                return jsonify({
                    'error': f'Label "{name}" already exists',
                    'success': False
                }), 409
                
        except ValueError:
            return jsonify({
                'error': 'Invalid productivity rate. Must be a number',
                'success': False
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def update_label(self, label_name):
        """API endpoint for updating existing activity label configurations."""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'No data provided',
                    'success': False
                }), 400
            
            # Extract update parameters
            productivity_rate = None
            if 'productivity_rate' in data:
                productivity_rate = float(data['productivity_rate'])
            
            description = data.get('description')
            color = data.get('color')
            
            success = self.label_manager.update_label(
                label_name, productivity_rate, description, color
            )
            
            if success:
                return jsonify({
                    'message': f'Label "{label_name}" updated successfully',
                    'success': True
                })
            else:
                return jsonify({
                    'error': f'Label "{label_name}" not found',
                    'success': False
                }), 404
                
        except ValueError:
            return jsonify({
                'error': 'Invalid productivity rate. Must be a number',
                'success': False
            }), 400
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def delete_label(self, label_name):
        """API endpoint for removing activity labels from the system."""
        try:
            success = self.label_manager.delete_label(label_name)
            
            if success:
                return jsonify({
                    'message': f'Label "{label_name}" deleted successfully',
                    'success': True
                })
            else:
                return jsonify({
                    'error': f'Label "{label_name}" not found',
                    'success': False
                }), 404
                
        except Exception as e:
            return jsonify({
                'error': str(e),
                'success': False
            }), 500
    
    def run(self, debug=True, host='127.0.0.1', port=5000):
        """Starts the Flask development server with specified configuration."""
        self.app.run(debug=debug, host=host, port=port)


# Application entry point for running the Flask server
if __name__ == '__main__':
    productivity_app = ProductivityApp()
    productivity_app.run(debug=True) 