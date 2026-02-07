import axios from 'axios';

// Base URL for your Django backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Main Axios instance for authenticated requests
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Separate Axios instance for authentication requests that should NOT send a token
const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


// Request interceptor to add the authentication token for 'api' instance
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration or invalid tokens for 'api' instance
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Optionally, redirect to login page or clear local storage
            console.error('Unauthorized: Token expired or invalid.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Depending on your frontend routing, you might want to redirect:
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

// --- Authentication Endpoints ---

export const authService = {
    /**
     * Registers a new user.
     * @param {Object} userData - User registration data (username, email, password, etc.)
     * @returns {Promise<Object>} - Response data including user info and token.
     */
    register: async (userData) => {
        const response = await authApi.post('/auth/register/', userData); // Use authApi
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    /**
     * Logs in an existing user.
     * @param {Object} credentials - User login credentials (username, password).
     * @returns {Promise<Object>} - Response data including user info and token.
     */
    login: async (credentials) => {
        const response = await authApi.post('/auth/login/', credentials); // Use authApi
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    /**
     * Logs out the current user by invalidating the token.
     * @returns {Promise<Object>} - Response indicating successful logout.
     */
    logout: async () => {
        // Assuming your backend has a logout endpoint that invalidates the token
        // This endpoint typically requires an authenticated user to invalidate their own token.
        try {
            await api.post('/auth/logout/'); // Use 'api' instance for logout as it requires token
        } catch (error) {
            // If token is already invalid or network error, proceed with local cleanup
            console.warn("Logout endpoint failed or token already invalid on server.", error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    },

    /**
     * Fetches the profile of the currently authenticated user.
     * @returns {Promise<Object>} - User profile data.
     */
    getUser: async () => {
        const response = await api.get('/auth/user/');
        return response.data;
    },

    /**
     * Updates the user's profile information.
     * @param {Object} profileData - Data to update the user's profile.
     * @returns {Promise<Object>} - Updated user profile data.
     */
    updateProfile: async (profileData) => {
        const response = await api.put('/auth/profile/', profileData);
        // Optionally update local storage if user data changes significantly
        // const currentUser = JSON.parse(localStorage.getItem('user'));
        // if (currentUser) {
        //     localStorage.setItem('user', JSON.stringify({ ...currentUser, ...response.data }));
        // }
        return response.data;
    },
};

export const settingsService = {
    /**
     * Fetches the combined user and user profile settings.
     * @returns {Promise<Object>} - Combined user and user profile data.
     */
    getSettings: async () => {
        const response = await api.get('/auth/settings/');
        return response.data;
    },

    /**
     * Updates the combined user and user profile settings.
     * @param {Object} settingsData - Data to update user and user profile settings.
     * @returns {Promise<Object>} - Updated combined user and user profile data.
     */
    updateSettings: async (settingsData) => {
        const response = await api.put('/auth/settings/', settingsData);
        return response.data;
    },
};

export const partnerService = {
    /**
     * Fetches a list of partner firms with optional filtering.
     * @param {Object} params - Query parameters for filtering (e.g., { search: 'tax', state: 'Lagos' }).
     * @returns {Promise<Object>} - Paginated list of partner firms.
     */
    getPartnerFirms: async (params) => {
        const response = await api.get('/partners/', { params });
        return response.data;
    },

    /**
     * Fetches details of a specific partner firm.
     * @param {number} id - The ID of the partner firm.
     * @returns {Promise<Object>} - Partner firm details.
     */
    getPartnerFirmDetail: async (id) => {
        const response = await api.get(`/partners/${id}/`);
        return response.data;
    },
};

// --- Other API Endpoints (example structure) ---
export const aiService = {
    chat: async (queryData) => {
        const response = await api.post('/ai/chat/', queryData);
        return response.data;
    },
    getConversations: async () => {
        const response = await api.get('/ai/conversations/');
        return response.data;
    },
    // ... other AI related endpoints
};

export const documentService = {
    /**
     * Uploads a financial document.
     * @param {FormData} formData - FormData object containing the file and document_type.
     * @returns {Promise<Object>} - Response data including document_id.
     */
    upload: async (formData) => {
        const response = await api.post('/documents/upload/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Fetches a list of financial documents.
     * @param {Object} params - Query parameters for filtering and pagination (e.g., { type: 'invoice', processed: true, page: 1 }).
     * @returns {Promise<Object>} - Paginated list of documents.
     */
    getDocuments: async (params) => {
        const response = await api.get('/documents/', { params });
        return response.data;
    },

    /**
     * Fetches statistics about user's documents.
     * @returns {Promise<Object>} - Document statistics.
     */
    getStats: async () => {
        const response = await api.get('/documents/stats/');
        return response.data;
    },

    /**
     * Deletes a specific financial document.
     * @param {number} id - The ID of the document to delete.
     * @returns {Promise<Object>} - Confirmation of deletion.
     */
    deleteDocument: async (id) => {
        const response = await api.delete(`/documents/${id}/`);
        return response.data;
    },

    /**
     * Deletes multiple financial documents.
     * @param {Array<number>} documentIds - An array of document IDs to delete.
     * @returns {Promise<Object>} - Confirmation of bulk deletion.
     */
    bulkDeleteDocuments: async (documentIds) => {
        const response = await api.post('/documents/bulk-delete/', { document_ids: documentIds });
        return response.data;
    },

    /**
     * Fetches the processing status of a specific document.
     * @param {number} id - The ID of the document.
     * @returns {Promise<Object>} - Document processing status.
     */
    getDocumentProcessingStatus: async (id) => {
        const response = await api.get(`/documents/${id}/status/`);
        return response.data;
    },

    /**
     * Fetches details of a specific financial document.
     * @param {number} id - The ID of the document.
     * @returns {Promise<Object>} - Document details.
     */
    getDocumentDetail: async (id) => {
        const response = await api.get(`/documents/${id}/`);
        return response.data;
    },
    // ... other document related endpoints
};

export const voiceService = {
    getCalls: async (params) => {
        const response = await api.get('/voice/calls/', { params });
        return response.data;
    },
};

export const dashboardService = {
    getDashboardData: async () => {
        const response = await api.get('/dashboard/');
        return response.data;
    },
};

export default api;
