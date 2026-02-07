import React, { useState, useEffect } from 'react';
import {
  Bell, HelpCircle, CheckCircle, Download,
  AlertTriangle, Users, Key, Shield,
  Building2, User, Mail, Settings,
  Save, X, Eye, EyeOff, Lock,
  ChevronDown, Calendar, FileText,
  CreditCard, Globe, LogOut
} from 'lucide-react';
import { settingsService } from '../services/api'; // Import the settings service
import Header from '../components/Header'; // Import the new Header component

const MavenSettings = () => {
  const [settings, setSettings] = useState({
    company_name: '',
    tax_identification_number: '',
    vat_registered: false,
    business_sector: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    state: '',
    employees_count: 1,
    annual_revenue: '',
    preferred_language: 'en',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await settingsService.getSettings();
        setSettings({
          company_name: data.company_name || '',
          tax_identification_number: data.tax_identification_number || '',
          vat_registered: data.vat_registered || false,
          business_sector: data.business_sector || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          state: data.state || '',
          employees_count: data.employees_count || 1,
          annual_revenue: data.annual_revenue || '',
          preferred_language: data.preferred_language || 'en',
        });
      } catch (err) {
        setError('Failed to fetch settings.');
        console.error('Error fetching settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      ...settings,
      annual_revenue: settings.annual_revenue === '' ? null : settings.annual_revenue,
      employees_count: settings.employees_count === '' ? null : settings.employees_count,
    };

    try {
      await settingsService.updateSettings(payload);
      setSuccessMessage('Settings updated successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', err);
      // Attempt to parse and display specific error messages from the backend
      if (err.response && err.response.data) {
        let errorMsg = 'Failed to save settings. Please try again.';
        if (typeof err.response.data === 'object') {
          // If the error response is an object, try to extract specific field errors
          const fieldErrors = Object.values(err.response.data).flat();
          if (fieldErrors.length > 0) {
            errorMsg = fieldErrors.join(' ');
          }
        } else if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        }
        setError(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-primary-500 dark:text-white">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="light">
      <div className="bg-background-light dark:bg-background-dark font-sans text-custom-text-primary dark:text-white transition-colors duration-200">
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
          <div className="layout-container flex h-full grow flex-col">
            <Header />

            <main className="flex-1 px-4 md:px-20 lg:px-40 py-8">
              <div className="layout-content-container flex flex-col max-w-[1024px] mx-auto flex-1">
                {/* PageHeading */}
                <div className="flex flex-wrap justify-between items-end gap-4 p-4 mb-4">
                  <div className="flex min-w-72 flex-col gap-2">
                    <p className="text-primary-500 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                      Settings & Profile
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                      Manage your business details, team, and security preferences.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary-500/10 dark:bg-primary-500/30 px-3 py-1.5 rounded-lg border border-primary-500/20">
                    <CheckCircle className="w-4 h-4 text-primary-500 dark:text-secondary-400" />
                    <span className="text-primary-500 dark:text-slate-200 text-xs font-bold uppercase tracking-wider">
                      Business Tier
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="pb-6">
                  <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-8 overflow-x-auto">
                    <a className="flex flex-col items-center justify-center border-b-[3px] border-b-primary-500 dark:border-b-secondary-400 text-primary-500 dark:text-white pb-[13px] pt-4 whitespace-nowrap" href="#">
                      <p className="text-sm font-bold leading-normal tracking-[0.015em]">Business Info</p>
                    </a>
                  </div>
                </div>
                
                {error && (
                  <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {/* SectionHeader */}
                  <div className="px-6 pt-6 pb-2">
                    <h2 className="text-primary-500 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
                      Business Information
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Basic identification and tax details for your organization.
                    </p>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 p-6">
                    {/* Company Name (TextField) */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Company Name</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="Enter company name"
                          name="company_name"
                          value={settings.company_name || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* First Name */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">First Name</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="Enter first name"
                          name="first_name"
                          value={settings.first_name || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* Last Name */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Last Name</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="Enter last name"
                          name="last_name"
                          value={settings.last_name || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Phone Number</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="e.g. +2348012345678"
                          name="phone_number"
                          value={settings.phone_number || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* TIN (Tax Identification Number) */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Tax ID Number (TIN)</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base font-mono"
                          placeholder="XX-XXXXXXX"
                          name="tax_identification_number"
                          value={settings.tax_identification_number || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* VAT Status */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">VAT Status</p>
                        <select
                          className="form-select flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 p-[10px] text-base leading-normal"
                          name="vat_registered"
                          value={settings.vat_registered ? 'registered' : 'not_registered'}
                          onChange={e => setSettings(prev => ({ ...prev, vat_registered: e.target.value === 'registered' }))}
                        >
                          <option value="registered">VAT Registered</option>
                          <option value="not_registered">Not VAT Registered</option>
                          {/* <option value="exempt">VAT Exempt</option> */}
                          {/* <option value="pending">Application Pending</option> */}
                        </select>
                      </label>
                    </div>

                    {/* Sector */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Business Sector</p>
                        <select
                          className="form-select flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 p-[10px] text-base leading-normal"
                          name="business_sector"
                          value={settings.business_sector || ''}
                          onChange={handleChange}
                        >
                          <option value="">Select Sector</option>
                          <option value="tech">Technology & SaaS</option>
                          <option value="finance">Financial Services</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="other">Other Professional Services</option>
                        </select>
                      </label>
                    </div>

                    {/* Annual Revenue */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Annual Revenue (NGN)</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="e.g. 5000000.00"
                          type="number"
                          step="0.01"
                          name="annual_revenue"
                          value={settings.annual_revenue || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* Employees Count */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">Number of Employees</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="e.g. 10"
                          type="number"
                          name="employees_count"
                          value={settings.employees_count || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                    {/* State (Location) */}
                    <div className="flex flex-col gap-1 py-3">
                      <label className="flex flex-col flex-1">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold pb-2">State (Nigeria)</p>
                        <input
                          className="form-input flex w-full rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 placeholder:text-slate-400 p-[15px] text-base"
                          placeholder="e.g. Lagos"
                          name="state"
                          value={settings.state || ''}
                          onChange={handleChange}
                        />
                      </label>
                    </div>

                  </div>
                </form>
              </div>
            </main>

            {/* Footer Small */}
            <footer className="py-10 px-10 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-slate-400 text-xs">
                © 2024 Maven Professional Services. All rights reserved.{' '}
                <a className="underline" href="#">
                  Privacy Policy
                </a>{' '}
                |{' '}
                <a className="underline" href="#">
                  Terms of Service
                </a>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MavenSettings;