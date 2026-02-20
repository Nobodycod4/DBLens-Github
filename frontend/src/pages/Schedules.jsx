import { useState, useEffect } from 'react';
import { getAllDatabases, listSchedules, createSchedule, updateSchedule, deleteSchedule, runScheduleNow } from '../services/api';
import { Database, Clock, Plus, Edit, Trash2, Play, Calendar, AlertCircle, CheckCircle, RefreshCw, Timer, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const GlassCard = ({ children, className = "", hover = true, padding = true }) => (
  <div className={`
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
    ${hover ? 'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 transition-all duration-300' : ''}
    ${padding ? 'p-6' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);

function Schedules() {
  const [databases, setDatabases] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    database_connection_id: '',
    schedule_name: '',
    schedule_type: 'daily',
    hour: 0,
    minute: 0,
    day_of_week: 'mon',
    day_of_month: 1,
    retention_count: 7,
    is_active: true
  });

  useEffect(() => { fetchDatabases(); fetchSchedules(); }, []);

  const fetchDatabases = async () => {
    try {
      const response = await getAllDatabases();
      setDatabases(response.data);
    } catch (err) {
      toast.error('Failed to load databases');
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await listSchedules();
      setSchedules(response.data);
    } catch (err) {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        toast.success('Schedule updated!');
      } else {
        await createSchedule(formData);
        toast.success('Schedule created!');
      }
      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to save schedule');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      database_connection_id: schedule.database_connection_id,
      schedule_name: schedule.schedule_name,
      schedule_type: schedule.schedule_type,
      hour: schedule.hour || 0,
      minute: schedule.minute || 0,
      day_of_week: schedule.day_of_week || 'mon',
      day_of_month: schedule.day_of_month || 1,
      retention_count: schedule.retention_count,
      is_active: schedule.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await deleteSchedule(scheduleId);
      toast.success('Schedule deleted!');
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleRunNow = async (scheduleId) => {
    try {
      await runScheduleNow(scheduleId);
      toast.success('Backup started!');
    } catch (err) {
      toast.error('Failed to start backup');
    }
  };

  const resetForm = () => {
    setFormData({
      database_connection_id: '',
      schedule_name: '',
      schedule_type: 'daily',
      hour: 0,
      minute: 0,
      day_of_week: 'mon',
      day_of_month: 1,
      retention_count: 7,
      is_active: true
    });
  };

  const getScheduleDescription = (schedule) => {
    const { schedule_type, hour, minute, day_of_week, day_of_month } = schedule;
    if (schedule_type === 'hourly') return `Every hour at :${String(minute).padStart(2, '0')}`;
    if (schedule_type === 'daily') return `Daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (schedule_type === 'weekly') return `Weekly on ${day_of_week} at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (schedule_type === 'monthly') return `Monthly on day ${day_of_month} at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return 'Custom schedule';
  };

  const getDatabaseName = (dbId) => {
    const db = databases.find(d => d.id === dbId);
    return db ? db.name : 'Unknown';
  };

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#0891B2] text-white shadow-lg">
              <Clock className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-secondary">
              Backup Schedules
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-12">Automate your database backups</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setEditingSchedule(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {
}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : schedules.length === 0 ? (
        <GlassCard className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#0891B2]/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-cyan-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Schedules Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Create your first backup schedule to automate backups</p>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Create First Schedule
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <GlassCard key={schedule.id}>
              {
}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {schedule.schedule_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {getDatabaseName(schedule.database_connection_id)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  schedule.is_active 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {
}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10">
                    <Timer className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{getScheduleDescription(schedule)}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10">
                    <RotateCcw className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Keep last {schedule.retention_count} backups</span>
                </div>

                {schedule.last_run_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Last: {new Date(schedule.last_run_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {schedule.next_run_at && schedule.is_active && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Next: {new Date(schedule.next_run_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {
}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200/50 dark:border-white/10">
                <button
                  onClick={() => handleRunNow(schedule.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Now
                </button>
                <button
                  onClick={() => handleEdit(schedule)}
                  className="p-2 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {
}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" hover={false}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingSchedule ? 'Edit Schedule' : 'New Backup Schedule'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule Name *</label>
                <input
                  type="text"
                  value={formData.schedule_name}
                  onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Daily Production Backup"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database *</label>
                <select
                  value={formData.database_connection_id}
                  onChange={(e) => setFormData({ ...formData, database_connection_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a database</option>
                  {databases.map(db => <option key={db.id} value={db.id}>{db.name} ({db.db_type})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule Type *</label>
                <select
                  value={formData.schedule_type}
                  onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {formData.schedule_type !== 'hourly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hour (0-23)</label>
                    <input type="number" min="0" max="23" value={formData.hour || 0} onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minute (0-59)</label>
                    <input type="number" min="0" max="59" value={formData.minute || 0} onChange={(e) => setFormData({ ...formData, minute: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" />
                  </div>
                </div>
              )}

              {formData.schedule_type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Day of Week</label>
                  <select value={formData.day_of_week} onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}day</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retention Count</label>
                <input type="number" min="1" max="100" value={formData.retention_count || 7} onChange={(e) => setFormData({ ...formData, retention_count: parseInt(e.target.value) || 7 })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white" />
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Number of backups to keep</p>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 accent-blue-500 rounded" />
                <label className="text-sm text-gray-700 dark:text-gray-300">Schedule is active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingSchedule(null); resetForm(); }} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#0891B2] hover:bg-[#0e7490] text-white rounded-xl transition-all font-medium">
                  {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default Schedules;

