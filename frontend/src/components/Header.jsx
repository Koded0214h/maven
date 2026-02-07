import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Settings } from 'lucide-react';

const Header = () => {
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark px-10 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <Link to="/" className="flex items-center gap-4 text-primary-500 dark:text-white">
                    <div className="size-8 bg-primary-500 rounded-lg flex items-center justify-center text-white">
                        <Landmark />
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Maven Tax Assistant</h2>
                </Link>
                {/* Search can be a future feature */}
            </div>
            <div className="flex flex-1 justify-end gap-8">
                <div className="flex items-center gap-9">
                    <Link to="/dashboard" className="text-sm font-medium leading-normal text-primary-500 transition-colors">
                        Dashboard
                    </Link>
                    <Link to="/docs" className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal hover:text-primary-500">
                        Documents
                    </Link>
                    <Link to="/chat" className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal hover:text-primary-500">
                        Maven AI
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Link to="/settings" className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 transition-colors">
                        <Settings className="text-xl" />
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
