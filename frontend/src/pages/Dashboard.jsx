import React, { useEffect, useState } from 'react';
import { Search, Bell, MessageCircle, FileText, CalendarCheck, TrendingUp, Download, MessageSquare, MessageSquarePlus, Upload, Video, CheckCircle, XCircle, ArrowUpCircle, MapPin, ArrowRight, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/api';
import { Link } from 'react-router-dom';
import Header from '../components/Header'; // Import the new Header component

const MavenDashboard = () => {
    const { user, setUser } = useAuth(); // Destructure setUser from useAuth()
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const dashboardData = await dashboardService.getDashboardData();
                setData(dashboardData);
                setError(null);

                // Update AuthContext's user state with the latest data from the dashboard API
                if (dashboardData?.current_user_data) {
                    setUser(dashboardData.current_user_data);
                }
            } catch (err) {
                setError(err.message);
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [setUser]); // Add setUser to dependency array

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">Loading Dashboard...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-700">Error: {error}</div>;
    }

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return { month: '', day: '' };
        const date = new Date(dateString);
        return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            day: date.getDate(),
        };
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const queriesUsed = user?.queries_used || 0;
    const queryLimit = user?.query_limit || 100;
    const queryPercentage = queryLimit > 0 ? (queriesUsed / queryLimit) * 100 : 0;
    
    const docsAnalyzedMonthly = data?.docStats?.monthly_analyzed || 0;
    const callsBooked = data?.voiceCalls?.results?.length || 0;

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-white min-h-screen">
            <Header /> {/* Use the new Header component */}

            <main className="max-w-[1280px] mx-auto px-10 py-8">
                <h1 className="text-3xl font-bold mb-4">{getGreeting()}, {user?.first_name || 'User'}!</h1>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Queries Used (Monthly)</p>
                            <MessageCircle className="text-secondary-400" />
                        </div>
                        <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold">{queriesUsed} / {queryLimit}</p>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                            <div className="bg-secondary-400 h-full rounded-full" style={{ width: `${queryPercentage}%` }}></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Docs Analyzed (Monthly)</p>
                            <FileText className="text-secondary-400" />
                        </div>
                        <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold">{docsAnalyzedMonthly} files</p>
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Calls Booked</p>
                            <CalendarCheck className="text-secondary-400" />
                        </div>
                        <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold">{callsBooked} scheduled</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Content */}
                    <div className="flex-1 flex flex-col gap-8">
                        {/* Activity Feed */}
                        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-800 overflow-hidden shadow-sm">
                            <h3 className="text-gray-900 dark:text-white text-xl font-bold p-6 border-b border-gray-200 dark:border-gray-800">
                                Recent Activity
                            </h3>
                            <div className="p-6">
                                {data?.queryHistory?.results?.length > 0 || data?.documents?.results?.length > 0 ? (
                                    <div className="grid grid-cols-[40px_1fr] gap-x-2">
                                        {data.queryHistory.results.slice(0, 2).map((item) => (
                                            <React.Fragment key={`query-${item.id}`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                        <MessageSquare className="text-lg" />
                                                    </div>
                                                    <div className="w-[2px] bg-gray-300 dark:bg-gray-800 h-10"></div>
                                                </div>
                                                <div className="flex flex-col pb-6">
                                                    <p className="text-gray-900 dark:text-white text-base font-semibold">Query: {item.title}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">New conversation started</p>
                                                    <p className="text-gray-600 dark:text-gray-500 text-xs mt-1">{new Date(item.created_at).toLocaleString()}</p>
                                                </div>
                                            </React.Fragment>
                                        ))}
                                        {data.documents.results.slice(0, 1).map((item) => (
                                             <React.Fragment key={`doc-${item.id}`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                                        <Download className="text-lg" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-gray-900 dark:text-white text-base font-semibold">Uploaded {item.original_filename}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Type: {item.document_type}</p>
                                                    <p className="text-gray-600 dark:text-gray-500 text-xs mt-1">{new Date(item.created_at).toLocaleString()}</p>
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 dark:text-gray-400">No recent activity.</p>}
                            </div>
                        </section>

                        {/* Upcoming Calls Widget */}
                        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                                <h2 className="text-gray-900 dark:text-white text-xl font-bold">Upcoming Calls</h2>
                                <Link to="/calendar" className="text-primary-500 dark:text-blue-400 text-sm font-semibold hover:underline">
                                    View Calendar
                                </Link>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                {data?.voiceCalls?.results?.length > 0 ? data.voiceCalls.results.slice(0, 2).map(call => {
                                    const { month, day } = formatDate(call.scheduled_time);
                                    return (
                                        <div key={call.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-gray-800/50 rounded-lg border border-transparent hover:border-primary-500/20 transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary-500 text-white p-2 rounded flex flex-col items-center min-w-[50px]">
                                                    <span className="text-xs uppercase font-bold">{month}</span>
                                                    <span className="text-xl font-bold leading-none">{day}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{call.topic}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">with Maven Expert</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-primary-500 dark:text-blue-300">{new Date(call.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{call.duration_minutes || 30} mins • {call.metadata?.platform || 'Zoom'}</p>
                                            </div>
                                        </div>
                                    )
                                }) : <p className="text-gray-500 dark:text-gray-400">No upcoming calls scheduled.</p>}
                            </div>
                        </section>
                    </div>

                    {/* Right Sidebar */}
                    <aside className="w-full lg:w-80 flex flex-col gap-6">
                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-300 dark:border-gray-800 shadow-sm">
                            <h4 className="text-primary-500 dark:text-gray-300 text-sm font-bold uppercase tracking-wider mb-4">
                                Quick Actions
                            </h4>
                            <div className="flex flex-col gap-3">
                                <Link to="/chat" className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all">
                                    <MessageSquarePlus className="text-xl" />
                                    Start New Chat
                                </Link>
                                <Link to="/docs" className="w-full bg-primary-500/10 text-primary-500 dark:bg-primary-500/20 dark:text-blue-200 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-500/20 transition-all">
                                    <Upload className="text-xl" />
                                    Upload Documents
                                </Link>
                                <Link to="/calendar" className="w-full bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                    <Video className="text-xl" />
                                    Book a Call
                                </Link>
                                <Link to="/partner" className="w-full bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                    <Users className="text-xl" />
                                    View Partners
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default MavenDashboard;
