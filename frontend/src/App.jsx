import { Route, Routes } from 'react-router-dom';

// Pages
import MavenLandingPage from './pages/Landing';
import MavenLoginScreen from './pages/Login';
import MavenSignUpScreen from './pages/Signup';
import MavenDashboard from './pages/Dashboard';
import MavenAIChat from './pages/CHat';
import MavenDocumentManager from './pages/Docs';
import MavenPartnerDirectory from './pages/Partners';
import MavenPricing from './pages/Pricing';
import MavenSettings from './pages/Settings';
import NotFound from './pages/NotFound'; // Import the NotFound page


export default function App() {
  return (
    
      <Routes>
        <Route path='/' element={<MavenLandingPage />} />
        <Route path='/login' element={<MavenLoginScreen />} />
        <Route path='/signup' element={<MavenSignUpScreen />} />
        <Route path='/dashboard' element={<MavenDashboard />} />
        <Route path='/chat' element={<MavenAIChat />} />
        <Route path='/docs' element={<MavenDocumentManager />} />
        <Route path='/partner' element={<MavenPartnerDirectory />} />
        <Route path='/settings' element={<MavenSettings />} />
        <Route path="*" element={<NotFound />} /> {/* Catch-all route for 404 */}
      </Routes>
    
  )
}