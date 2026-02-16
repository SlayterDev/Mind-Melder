import { useState, useEffect } from 'react';
import { settingsAPI, type Settings } from '../api/client';

export default function NotificationSettings() {
  const [settings, setSettings] = useState<Partial<Settings>>({
    notificationsEnabled: true,
    notificationsMorningReminderEnabled: true,
    notificationsMorningReminderTime: '09:00',
    notificationsAfternoonReminderEnabled: false,
    notificationsAfternoonReminderTime: '15:00',
    notificationsShowOverdue: true,
    notificationsQuietHoursStart: null,
    notificationsQuietHoursEnd: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(
      typeof window !== 'undefined' && window.electronAPI?.isElectron === true
    );

    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const allSettings = await settingsAPI.get();
      
      // Extract notification settings
      setSettings({
        notificationsEnabled: allSettings.notificationsEnabled ?? true,
        notificationsMorningReminderEnabled: allSettings.notificationsMorningReminderEnabled ?? true,
        notificationsMorningReminderTime: allSettings.notificationsMorningReminderTime ?? '09:00',
        notificationsAfternoonReminderEnabled: allSettings.notificationsAfternoonReminderEnabled ?? false,
        notificationsAfternoonReminderTime: allSettings.notificationsAfternoonReminderTime ?? '15:00',
        notificationsShowOverdue: allSettings.notificationsShowOverdue ?? true,
        notificationsQuietHoursStart: allSettings.notificationsQuietHoursStart ?? null,
        notificationsQuietHoursEnd: allSettings.notificationsQuietHoursEnd ?? null,
      });
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Save settings via the settings API
      await settingsAPI.update({
        notificationsEnabled: settings.notificationsEnabled,
        notificationsMorningReminderEnabled: settings.notificationsMorningReminderEnabled,
        notificationsMorningReminderTime: settings.notificationsMorningReminderTime,
        notificationsAfternoonReminderEnabled: settings.notificationsAfternoonReminderEnabled,
        notificationsAfternoonReminderTime: settings.notificationsAfternoonReminderTime,
        notificationsShowOverdue: settings.notificationsShowOverdue,
        notificationsQuietHoursStart: settings.notificationsQuietHoursStart || null,
        notificationsQuietHoursEnd: settings.notificationsQuietHoursEnd || null,
      });

      // Restart notification service if in Electron
      if (isElectron && window.electronAPI?.restartNotificationService) {
        await window.electronAPI.restartNotificationService();
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckNow = async () => {
    if (isElectron && window.electronAPI?.checkNotifications) {
      try {
        await window.electronAPI.checkNotifications();
        alert('Notification check triggered manually.');
      } catch (err) {
        console.error('Failed to check notifications:', err);
        alert('Failed to trigger notification check');
      }
    }
  };

  if (!isElectron) {
    return (
      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Desktop App Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Notifications are only available in the desktop app. Download it from the releases page
              to receive desktop notifications for your todos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Desktop Notifications
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Receive daily summaries of your todos with due dates at scheduled times.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <p className="text-green-800 dark:text-green-200 text-sm">Settings saved successfully!</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Master toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            Enable desktop notifications
          </span>
        </label>

        {/* Settings only shown when enabled */}
        {settings.notificationsEnabled && (
          <div className="ml-7 space-y-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {/* Morning reminder */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsMorningReminderEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsMorningReminderEnabled: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Morning reminder
                </span>
              </label>
              {settings.notificationsMorningReminderEnabled && (
                <div className="ml-7">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={settings.notificationsMorningReminderTime}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationsMorningReminderTime: e.target.value })
                    }
                    className="block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Receive a summary of todos due today and overdue tasks
                  </p>
                </div>
              )}
            </div>

            {/* Afternoon reminder */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsAfternoonReminderEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsAfternoonReminderEnabled: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Afternoon reminder
                </span>
              </label>
              {settings.notificationsAfternoonReminderEnabled && (
                <div className="ml-7">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={settings.notificationsAfternoonReminderTime}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationsAfternoonReminderTime: e.target.value })
                    }
                    className="block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Receive a preview of todos due tomorrow
                  </p>
                </div>
              )}
            </div>

            {/* Show overdue */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsShowOverdue}
                onChange={(e) => setSettings({ ...settings, notificationsShowOverdue: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include overdue tasks in morning reminder
              </span>
            </label>

            {/* Quiet hours */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quiet hours (optional):
              </label>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={settings.notificationsQuietHoursStart || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationsQuietHoursStart: e.target.value || null })
                    }
                    className="block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="text-gray-500 dark:text-gray-400 pt-5">to</div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={settings.notificationsQuietHoursEnd || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, notificationsQuietHoursEnd: e.target.value || null })
                    }
                    className="block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                No notifications will be sent during quiet hours
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {settings.notificationsEnabled && (
          <button
            onClick={handleCheckNow}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
          >
            Test Notifications
          </button>
        )}
      </div>
    </div>
  );
}
