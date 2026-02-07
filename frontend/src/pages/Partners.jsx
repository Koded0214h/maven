import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, MapPin, ChevronDown, Star, Calendar,
  FileText, Globe, Mail, Share2, LogIn, UserPlus,
  Building2, Users, DollarSign, PieChart, TrendingUp,
  Briefcase, FileCheck, Calculator, Landmark, Home,
  ChevronRight, CheckCircle, Search
} from 'lucide-react';
import { partnerService } from '../services/api'; // Import the new partner service
import Header from '../components/Header'; // Import the new Header component

// List of Nigerian states for the filter, including 'All Regions'
const NIGERIAN_STATES = [
  'All Regions', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Abuja (FCT)'
];

const MavenPartnerDirectory = () => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All Regions');
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  useEffect(() => {
    const fetchPartners = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {};
        if (searchTerm) {
          params.search = searchTerm;
        }
        if (selectedState && selectedState !== 'All Regions') {
          params.state = selectedState;
        }
        
        const response = await partnerService.getPartnerFirms(params);
        setPartners(response.results); // Assuming API returns { results: [], count: ... }
      } catch (err) {
        console.error('Failed to fetch partners:', err);
        setError('Failed to load partners. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchPartners();
    }, 500); // Debounce search input

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, selectedState]); // Re-fetch when search term or selected state changes

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStateChange = (state) => {
    setSelectedState(state);
    setShowStateDropdown(false); // Close dropdown after selection
  };

  return (
    <div className="light">
      <div className="bg-background-light dark:bg-background-dark font-sans min-h-screen text-custom-text-primary dark:text-white">
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
          <div className="layout-container flex h-full grow flex-col">
            <Header />

            <main className="flex flex-1 justify-center py-10 px-4 md:px-10">
              <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
                {/* Page Heading */}
                <div className="flex flex-wrap justify-between gap-3 mb-8">
                  <div className="flex min-w-72 flex-col gap-2">
                    <p className="text-4xl font-black leading-tight tracking-[-0.033em]">
                      Verified Tax Partners in Nigeria
                    </p>
                    <p className="text-primary-500/60 dark:text-white/60 text-lg font-normal leading-normal">
                      Connect with 150+ licensed tax firms and expert consultants across all 36 states.
                    </p>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white dark:bg-background-dark p-4 rounded-xl border border-primary-500/5 shadow-sm">
                  <div className="flex-1">
                    <label className="flex flex-col min-w-40 h-12 w-full">
                      <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden border border-primary-500/10 focus-within:border-primary-500 transition-all">
                        <div className="text-primary-500/50 flex bg-primary-500/5 items-center justify-center pl-4 pr-1">
                          <Search className="w-5 h-5" />
                        </div>
                        <input
                          className="form-input flex w-full min-w-0 flex-1 resize-none border-none bg-primary-500/5 focus:outline-0 focus:ring-0 text-base font-normal leading-normal px-3 placeholder:text-primary-500/40"
                          placeholder="Search by firm name, service, or keyword (e.g. Audit, VAT Filing)"
                          value={searchTerm}
                          onChange={handleSearchChange}
                        />
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="relative min-w-[200px]">
                      <button
                        className="flex w-full h-12 items-center justify-between gap-x-2 rounded-lg border border-primary-500/10 bg-primary-500/5 px-4 text-sm font-medium hover:border-primary-500 transition-all"
                        onClick={() => setShowStateDropdown(!showStateDropdown)}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary-500/60" />
                          <span className="text-primary-500 dark:text-white">{selectedState}</span>
                        </div>
                        <ChevronDown className="w-5 h-5" />
                      </button>
                      {showStateDropdown && (
                        <div className="absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white dark:bg-background-dark ring-1 ring-black ring-opacity-5 z-10 max-h-60 overflow-y-auto">
                          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="state-options-menu">
                            {NIGERIAN_STATES.map((state) => (
                              <a
                                key={state}
                                href="#"
                                className="block px-4 py-2 text-sm text-primary-500 dark:text-white hover:bg-primary-500/5"
                                onClick={(e) => { e.preventDefault(); handleStateChange(state); }}
                                role="menuitem"
                              >
                                {state}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* State Quick Filter Chips */}
                <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                  {NIGERIAN_STATES.map((state) => (
                    <button
                      key={state}
                      className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 text-sm font-semibold transition-all
                        ${selectedState === state
                          ? 'bg-primary-500 text-white'
                          : 'bg-white dark:bg-background-dark border border-primary-500/10 hover:border-primary-500 hover:bg-primary-500/5'
                        }`}
                      onClick={() => handleStateChange(state)}
                    >
                      {state}
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="text-center text-lg text-primary-500 dark:text-white my-8">
                    Loading partners...
                  </div>
                )}

                {error && (
                  <div className="text-center text-lg text-red-500 dark:text-red-400 my-8">
                    {error}
                  </div>
                )}

                {!isLoading && !error && partners.length === 0 && (
                  <div className="text-center text-lg text-primary-500/60 dark:text-white/60 my-8">
                    No partners found matching your criteria.
                  </div>
                )}

                {/* Partner Grid */}
                {!isLoading && !error && partners.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {partners.map((partner) => (
                      <div key={partner.id} className="group bg-white dark:bg-background-dark rounded-xl border border-primary-500/5 shadow-sm hover:shadow-md hover:border-primary-500/20 transition-all flex flex-col">
                        <div className="relative p-6 pb-0">
                          <div
                            className="w-full h-48 bg-center bg-no-repeat bg-cover rounded-lg mb-4"
                            style={{
                              backgroundImage: `url("${partner.image_url || 'https://via.placeholder.com/400x200?text=Partner+Image'}")`,
                            }}
                            alt={`Office building of ${partner.name}`}
                          ></div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <h3 className="text-lg font-bold text-primary-500 dark:text-white leading-none">
                                  {partner.name}
                                </h3>
                                {partner.is_verified && (
                                  <CheckCircle className="w-5 h-5 text-green-500 fill-current" title="Verified Partner" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-primary-500/60 dark:text-white/60 text-sm font-medium">
                                {partner.rating > 0 && (
                                  <>
                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    <span>{partner.rating.toFixed(1)}</span>
                                    <span className="mx-1">•</span>
                                  </>
                                )}
                                <span>
                                  {partner.states_covered && partner.states_covered.length > 0
                                    ? partner.states_covered.join(', ')
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 pt-4 flex-1">
                          <div className="flex flex-wrap gap-1.5 mb-6">
                            {partner.services && partner.services.length > 0 ? (
                              partner.services.slice(0, 3).map((service, index) => (
                                <span key={index} className="px-2.5 py-1 bg-primary-500/5 text-primary-500/80 dark:text-white/80 text-[11px] font-bold uppercase tracking-wider rounded">
                                  {service}
                                </span>
                              ))
                            ) : (
                              <span className="px-2.5 py-1 bg-primary-500/5 text-primary-500/80 dark:text-white/80 text-[11px] font-bold uppercase tracking-wider rounded">
                                General Tax Services
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 h-10 bg-primary-500 text-white text-xs font-bold rounded-lg hover:bg-primary-500/90 transition-all">
                              Book Consultation
                            </button>
                            <button className="flex-1 h-10 border border-primary-500/10 text-primary-500 dark:text-white text-xs font-bold rounded-lg hover:bg-primary-500/5 transition-all">
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-primary-500/5 bg-white dark:bg-background-dark px-10 py-12">
              <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-primary-500 dark:text-white mb-4">
                    <div className="size-5">
                      <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                        <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
                      </svg>
                    </div>
                    <h3 className="font-bold text-lg">Maven Partner Directory</h3>
                  </div>
                  <p className="text-sm text-primary-500/60 dark:text-white/60 max-w-xs leading-relaxed">
                    Connecting Nigerian businesses with the highest standard of tax and financial advisory professionals.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-4 text-sm">Quick Links</h4>
                  <ul className="space-y-2 text-sm text-primary-500/60 dark:text-white/60">
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <Calendar className="w-3 h-3" />
                        Tax Calendar
                      </a>
                    </li>
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <FileText className="w-3 h-3" />
                        Resources
                      </a>
                    </li>
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <Landmark className="w-3 h-3" />
                        FIRS Regulations
                      </a>
                    </li>
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <Home className="w-3 h-3" />
                        States BIR
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-4 text-sm">Legal</h4>
                  <ul className="space-y-2 text-sm text-primary-500/60 dark:text-white/60">
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <ShieldCheck className="w-3 h-3" />
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <FileText className="w-3 h-3" />
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a className="hover:text-primary-500 transition-colors flex items-center gap-1" href="#">
                        <CheckCircle className="w-3 h-3" />
                        Partner Standards
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-primary-500/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-primary-500/40 dark:text-white/40">
                  © 2024 Maven Financial Network. All rights reserved.
                </p>
                <div className="flex gap-4">
                  <Globe className="w-5 h-5 text-primary-500/40 cursor-pointer hover:text-primary-500 transition-colors" />
                  <Mail className="w-5 h-5 text-primary-500/40 cursor-pointer hover:text-primary-500 transition-colors" />
                  <Share2 className="w-5 h-5 text-primary-500/40 cursor-pointer hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MavenPartnerDirectory;