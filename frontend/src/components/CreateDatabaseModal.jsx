import { useState } from 'react';
import { X } from 'lucide-react';

function CreateDatabaseModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    db_type: 'sqlite',
    database_name: '',
    username: 'admin',
    password: 'admin123'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create New Database</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {
}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Database Type</label>
            <select
              value={formData.db_type}
              onChange={(e) => setFormData({...formData, db_type: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="sqlite">SQLite (File-based)</option>
              <option value="postgresql">PostgreSQL (Native)</option>
              <option value="mysql">MySQL (Docker)</option>
              <option value="mongodb">MongoDB (Docker)</option>
            </select>
          </div>

          {
}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Database Name</label>
            <input
              type="text"
              value={formData.database_name}
              onChange={(e) => setFormData({...formData, database_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="my_database"
              required
            />
          </div>

          {
}
          {formData.db_type !== 'sqlite' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            </>
          )}

          {
}
<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
  {formData.db_type === 'sqlite' 
    ? '✅ SQLite will create a local file in ./dblens_databases/'
    : `⚙️ This will create a database on your local ${formData.db_type.toUpperCase()} server`}
</div>

          {
}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Database
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDatabaseModal;
