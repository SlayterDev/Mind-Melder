import { useState, useEffect } from 'react';
import { settingsAPI, type Settings } from '../api/client';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

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
  const [success, setSuccess] = useState<'saved' | 'tested' | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
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
      if (isElectron && window.electronAPI?.restartNotificationService) {
        await window.electronAPI.restartNotificationService();
      }
      setSuccess('saved');
      setTimeout(() => setSuccess(null), 3000);
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
        setSuccess('tested');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Failed to check notifications:', err);
        setError('Failed to trigger notification check');
      }
    }
  };

  if (!isElectron) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Desktop Notifications</h3>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
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
            <p className="text-sm font-medium text-gray-300 mb-1">Desktop App Required</p>
            <p className="text-xs text-gray-500">
              Notifications are only available in the desktop app. Download it from the releases page
              to receive desktop notifications for your todos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Desktop Notifications</h3>
        <p className="text-sm text-gray-500">
          Receive daily summaries of your todos with due dates at scheduled times.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
          {success === 'tested' ? 'Test notification sent!' : 'Settings saved successfully!'}
        </div>
      )}

      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">Enable desktop notifications</p>
        <Toggle
          checked={!!settings.notificationsEnabled}
          onChange={(v) => setSettings({ ...settings, notificationsEnabled: v })}
          disabled={saving}
        />
      </div>

      {/* Sub-settings — only shown when enabled */}
      {settings.notificationsEnabled && (
        <div className="space-y-6 border-t border-gray-800 pt-5">
          {/* Morning reminder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Morning reminder</p>
                <p className="text-xs text-gray-500 mt-0.5">Today's tasks and overdue items</p>
              </div>
              <Toggle
                checked={!!settings.notificationsMorningReminderEnabled}
                onChange={(v) => setSettings({ ...settings, notificationsMorningReminderEnabled: v })}
                disabled={saving}
              />
            </div>
            {settings.notificationsMorningReminderEnabled && (
              <div className="ml-4 pl-4 border-l border-gray-700">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Time</label>
                <input
                  type="time"
                  value={settings.notificationsMorningReminderTime}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsMorningReminderTime: e.target.value })
                  }
                  className="input-accent w-36"
                />
              </div>
            )}
          </div>

          {/* Afternoon reminder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Afternoon reminder</p>
                <p className="text-xs text-gray-500 mt-0.5">Preview of tomorrow's tasks</p>
              </div>
              <Toggle
                checked={!!settings.notificationsAfternoonReminderEnabled}
                onChange={(v) => setSettings({ ...settings, notificationsAfternoonReminderEnabled: v })}
                disabled={saving}
              />
            </div>
            {settings.notificationsAfternoonReminderEnabled && (
              <div className="ml-4 pl-4 border-l border-gray-700">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Time</label>
                <input
                  type="time"
                  value={settings.notificationsAfternoonReminderTime}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsAfternoonReminderTime: e.target.value })
                  }
                  className="input-accent w-36"
                />
              </div>
            )}
          </div>

          {/* Show overdue */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Include overdue tasks</p>
              <p className="text-xs text-gray-500 mt-0.5">Show overdue items in morning reminder</p>
            </div>
            <Toggle
              checked={!!settings.notificationsShowOverdue}
              onChange={(v) => setSettings({ ...settings, notificationsShowOverdue: v })}
              disabled={saving}
            />
          </div>

          {/* Quiet hours */}
          <div className="border-t border-gray-800 pt-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Quiet hours</p>
              <p className="text-xs text-gray-500 mt-0.5">No notifications will be sent during this window</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Start</label>
                <input
                  type="time"
                  value={settings.notificationsQuietHoursStart || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsQuietHoursStart: e.target.value || null })
                  }
                  className="input-accent w-36"
                />
              </div>
              <span className="text-gray-600 mt-5">—</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">End</label>
                <input
                  type="time"
                  value={settings.notificationsQuietHoursEnd || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsQuietHoursEnd: e.target.value || null })
                  }
                  className="input-accent w-36"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-800">
        <button onClick={handleSave} disabled={saving} className="btn-accent">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {settings.notificationsEnabled && (
          <button
            onClick={handleCheckNow}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Test Notifications
          </button>
        )}
      </div>
    </div>
  );
}
