'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAdminNumber() {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_whatsapp_number')
        .single();
      if (error) {
        console.error('Error fetching admin WhatsApp number:', error);
      } else {
        setWhatsappNumber(data?.value || '');
      }
      setLoading(false);
    }
    fetchAdminNumber();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('admin_settings')
      .update({ value: whatsappNumber })
      .eq('key', 'admin_whatsapp_number');
    if (error) {
      alert('Error saving admin WhatsApp number: ' + error.message);
    } else {
      alert('Admin WhatsApp number saved successfully!');
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      <div className="max-w-md">
        <label className="block text-sm font-medium mb-2">Admin WhatsApp Number</label>
        <input
          type="text"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          className="w-full p-2 border rounded bg-gray-800 text-white"
          placeholder="e.g., 1234567890"
        />
        <button onClick={handleSave} disabled={saving} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
