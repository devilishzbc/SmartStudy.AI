from ortools.sat.python import cp_model
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class SchedulingEngine:
    """
    OR-Tools CP-SAT based scheduling engine for study sessions.
    
    Optimizes task scheduling based on:
    - Task urgency (proximity to due date)
    - Task priority
    - Availability windows
    - Session length preferences
    """
    
    def __init__(self, user_preferences: dict):
        self.preferred_session_length = user_preferences.get('preferred_session_length', 50)
        self.break_preference = user_preferences.get('break_preference', 10)
        self.max_daily_hours = user_preferences.get('weekly_hours_goal', 20) / 5  # Rough daily avg
    
    def generate_schedule(
        self,
        tasks: List[dict],
        availability_windows: List[Tuple[datetime, datetime]],
        start_date: datetime,
        end_date: datetime
    ) -> List[dict]:
        """
        Generate optimized study schedule using OR-Tools CP-SAT solver.
        
        Args:
            tasks: List of task dictionaries with id, title, due_date, priority, estimated_minutes
            availability_windows: List of (start_time, end_time) tuples
            start_date: Schedule start date
            end_date: Schedule end date
            
        Returns:
            List of scheduled session dictionaries
        """
        if not tasks or not availability_windows:
            logger.info("No tasks or availability windows provided")
            return []
        
        # Create the model
        model = cp_model.CpModel()
        
        # Convert times to minutes from epoch for easier calculation
        time_horizon = int((end_date - start_date).total_seconds() / 60)
        
        # Decision variables: session start times and assignments
        session_vars = {}
        task_sessions = {}
        
        for task in tasks:
            task_id = task['id']
            estimated_minutes = task['estimated_minutes']
            
            # Break task into chunks based on preferred session length
            num_sessions = max(1, (estimated_minutes + self.preferred_session_length - 1) // self.preferred_session_length)
            task_sessions[task_id] = []
            
            for session_idx in range(num_sessions):
                session_duration = min(self.preferred_session_length, estimated_minutes - session_idx * self.preferred_session_length)
                
                # Create variable for session start time (in minutes from start_date)
                var_name = f"task_{task_id}_session_{session_idx}"
                
                # Due date constraint - session must end before due date
                due_date_minutes = int((task['due_date'] - start_date).total_seconds() / 60)
                max_start = max(0, due_date_minutes - session_duration)
                
                start_var = model.NewIntVar(0, min(time_horizon, max_start), f"{var_name}_start")
                end_var = model.NewIntVar(0, time_horizon, f"{var_name}_end")
                
                # Ensure end = start + duration
                model.Add(end_var == start_var + session_duration)
                
                session_vars[var_name] = {
                    'start': start_var,
                    'end': end_var,
                    'task_id': task_id,
                    'duration': session_duration,
                    'session_idx': session_idx
                }
                task_sessions[task_id].append(var_name)
        
        # Constraint: No overlapping sessions
        all_sessions = list(session_vars.keys())
        for i in range(len(all_sessions)):
            for j in range(i + 1, len(all_sessions)):
                session_i = session_vars[all_sessions[i]]
                session_j = session_vars[all_sessions[j]]
                
                # Create interval variables for overlap detection
                interval_i = model.NewIntervalVar(
                    session_i['start'],
                    session_i['duration'],
                    session_i['end'],
                    f"interval_{all_sessions[i]}"
                )
                interval_j = model.NewIntervalVar(
                    session_j['start'],
                    session_j['duration'],
                    session_j['end'],
                    f"interval_{all_sessions[j]}"
                )
                
                model.AddNoOverlap([interval_i, interval_j])\n        
        # Constraint: Sessions must be within availability windows
        for session_name, session_info in session_vars.items():
            # Create boolean variables for each availability window
            window_vars = []
            for idx, (window_start, window_end) in enumerate(availability_windows):
                window_start_minutes = int((window_start - start_date).total_seconds() / 60)
                window_end_minutes = int((window_end - start_date).total_seconds() / 60)
                
                # Session must be entirely within this window
                in_window = model.NewBoolVar(f"{session_name}_in_window_{idx}")
                
                # If in_window is true, then start >= window_start AND end <= window_end
                model.Add(session_info['start'] >= window_start_minutes).OnlyEnforceIf(in_window)
                model.Add(session_info['end'] <= window_end_minutes).OnlyEnforceIf(in_window)
                
                window_vars.append(in_window)
            
            # At least one window must be selected
            if window_vars:
                model.AddBoolOr(window_vars)
        
        # Objective: Minimize urgency * priority (earlier completion of high-priority urgent tasks)
        objective_terms = []
        for task in tasks:
            task_id = task['id']
            urgency = self._calculate_urgency(task['due_date'], start_date)
            priority_weight = self._get_priority_weight(task['priority'])
            
            # Sum of all session end times for this task (want to minimize)
            for session_name in task_sessions.get(task_id, []):
                session_info = session_vars[session_name]
                # Weight by urgency and priority
                objective_terms.append(session_info['end'] * urgency * priority_weight)
        
        if objective_terms:
            model.Minimize(sum(objective_terms))
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10.0  # 10 second timeout
        status = solver.Solve(model)
        
        # Extract solution
        scheduled_sessions = []
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for session_name, session_info in session_vars.items():
                start_minutes = solver.Value(session_info['start'])
                session_start = start_date + timedelta(minutes=start_minutes)
                session_end = session_start + timedelta(minutes=session_info['duration'])
                
                # Find the task details
                task = next((t for t in tasks if t['id'] == session_info['task_id']), None)
                
                scheduled_sessions.append({
                    'task_id': session_info['task_id'],
                    'course_id': task['course_id'] if task else None,
                    'start_time': session_start.isoformat(),
                    'end_time': session_end.isoformat(),
                    'planned_minutes': session_info['duration'],
                    'session_type': 'study',
                    'status': 'planned'
                })
            
            logger.info(f"Scheduled {len(scheduled_sessions)} sessions")
        else:
            logger.warning(f"Solver status: {status}. Could not find optimal schedule.")
        
        return scheduled_sessions
    
    def _calculate_urgency(self, due_date: datetime, current_date: datetime) -> int:
        """Calculate urgency score (higher = more urgent)"""
        days_until_due = (due_date - current_date).days
        if days_until_due <= 1:
            return 10
        elif days_until_due <= 3:
            return 7
        elif days_until_due <= 7:
            return 5
        elif days_until_due <= 14:
            return 3
        else:
            return 1
    
    def _get_priority_weight(self, priority: str) -> int:
        """Get weight for priority level"""
        priority_weights = {
            'urgent': 10,
            'high': 7,
            'medium': 5,
            'low': 3
        }
        return priority_weights.get(priority.lower(), 5)
