import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

const MavenSignUpScreen = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null); // Define local error state
  const phoneCode = '+234'; // Keep if you want to display it

  const { register, error: authError, isLoading } = useAuth();


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData((prev) => ({
      ...prev,
      phone: value,
    }));
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    // Assuming Nigerian phone format like 803 123 4567 (10 digits after code)
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null); // Clear previous local errors

    // Basic client-side validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
        setLocalError('All fields are required.');
        return;
    }
    if (!formData.agreeTerms) {
      setLocalError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    const [firstName, ...lastNameParts] = formData.fullName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    try {
      await register({
        username: formData.email, // Using email as username
        email: formData.email,
        password: formData.password,
        first_name: firstName,
        last_name: lastName,
        phone_number: `${phoneCode}${formData.phone}`,
        user_type: 'individual', // Default value, can be expanded later
        company_name: '',
        business_sector: '',
        state: '',
      });
    } catch (err) {
      console.error('Signup attempt error:', err);
      // authError from useAuth will be displayed, no need to set localError here for API errors
    }
  };

  const passwordStrength = () => {
    const { password } = formData;
    if (password.length === 0) return { strength: 0, color: 'bg-gray-200', label: '' };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

    return {
      strength: score,
      color: colors[Math.min(score, 4)],
      label: labels[Math.min(score, 4)],
    };
  };

  const strength = passwordStrength();

  const apiErrorMessage = authError
    ? (typeof authError === 'object'
        ? Object.keys(authError).map(key => {
            const errorValue = authError[key];
            return `${key}: ${Array.isArray(errorValue) ? errorValue.join(', ') : errorValue}`;
          }).join('\n')
        : authError.toString())
    : null;

  const displayError = localError || apiErrorMessage; // Prioritize local errors if any, then API errors

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side: Value Propositions */}
        <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary-500 p-12 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h-20v20h20V20zm0-20h20v20h-20V0z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
                backgroundSize: '40px 40px',
              }}
            ></div>
          </div>

          {/* Content */}
          <div className="max-w-lg z-10">
            {/* Logo and Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold">Maven</h2>
              </div>
              <h1 className="text-5xl font-black leading-tight mb-6">Empower your business with AI tax expertise.</h1>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <p className="text-lg font-semibold">Tailored for Nigerian Business Owners</p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-8">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                  title: 'Instant Legal Citations',
                  description: 'Get precise references to Nigerian Tax Laws (CITA, PITA, VAT Act) in seconds.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Document Analysis',
                  description: 'Upload FIRS notices or tax assessments and get instant, simplified summaries.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Compliance Guaranteed',
                  description: 'Stay updated with the latest Finance Act amendments automatically.',
                },
              ].map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-white/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-24">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary-500 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-primary-500">Maven</h2>
              </div>
            </div>

            {/* Form Header */}
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Create your account</h2>
              <p className="text-gray-600">Join the community of compliant Nigerian businesses.</p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error! </strong>
                <span className="block sm:inline">{displayError}</span>
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                  placeholder="e.g. John Doe"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Business Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                  placeholder="name@company.com.ng"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                  <div className="flex items-center px-4 bg-gray-50 border-r border-gray-300">
                    <span className="text-gray-700 font-medium">{phoneCode}</span>
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={formatPhoneNumber(formData.phone)}
                    onChange={handlePhoneChange}
                    className="flex-1 px-4 py-3 focus:outline-none"
                    placeholder="803 123 4567"
                    maxLength="12"
                    required
                    disabled={isLoading}
                  />
                  <div className="flex items-center px-4 text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter your Nigerian phone number</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none pr-12"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">Password strength:</span>
                      <span
                        className={`font-medium ${
                          strength.strength >= 4
                            ? 'text-green-600'
                            : strength.strength >= 3
                            ? 'text-yellow-600'
                            : strength.strength >= 2
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.strength / 4) * 100}%` }}
                      ></div>
                    </div>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li className={`${formData.password.length >= 8 ? 'text-green-600' : ''}`}>• At least 8 characters</li>
                      <li className={`${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>• At least one uppercase letter</li>
                      <li className={`${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>• At least one number</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                  required
                  disabled={isLoading}
                />
                <label htmlFor="agreeTerms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="font-semibold text-primary-500 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="font-semibold text-primary-500 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!formData.agreeTerms || isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-10 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-primary-500 hover:text-primary-600 hover:underline">
                  Login
                </Link>
              </p>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to receive important tax compliance updates and notifications.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Need help? <Link to="/support" className="text-primary-500 hover:underline">Contact Support</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MavenSignUpScreen;