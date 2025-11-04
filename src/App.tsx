import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import OrderCreatePage from './pages/OrderCreatePage';
import TaskCreatePage from './pages/TaskCreatePage';
import MarketPage from './pages/MarketPage';
import MyOrdersPage from './pages/MyOrdersPage';
import MyTasksPage from './pages/MyTasksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TaskDetailPage from './pages/TaskDetailPage';
import ProposalsPage from './pages/ProposalsPage';
import MessagesPage from './pages/MessagesPage';
import NotFound from './pages/NotFound';
import ProposalsCreate from './pages/proposals/Create';
import PublicProfile from './pages/users/PublicProfile';
import PortfolioAdd from './pages/me/PortfolioAdd';
import DealOpen from './pages/deal/Open';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import {
  DealPage,
  WalletPage,
  TalentsPage,
  NotificationsPage,
  SavedPage,
  DisputesPage,
  MyOrdersPage,
  MyDealsPage,
  SettingsProfilePage,
  SettingsSecurityPage,
  OnboardingPage,
  AdminPage,
  TermsPage,
  PrivacyPage,
  FAQPage,
  ContactPage,
  NotFoundPage
} from './pages/AllPages';

function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  let Page;

  if (route === '/') {
    Page = HomePage;
  } else if (route === '/auth/login' || route === '/login') {
    Page = LoginPage;
  } else if (route === '/auth/register' || route === '/register') {
    Page = RegisterPage;
  } else if (route === '/onboarding') {
    Page = OnboardingPage;
  } else if (route === '/me' || route === '/profile') {
    Page = ProfilePage;
  } else if (route === '/me/edit') {
    Page = ProfilePage;
  } else if (route === '/me/orders') {
    Page = MyOrdersPage;
  } else if (route === '/me/deals') {
    Page = MyDealsPage;
  } else if (route === '/me/portfolio') {
    Page = ProfilePage;
  } else if (route.startsWith('/me/portfolio/add')) {
    Page = PortfolioAdd;
  } else if (route === '/orders') {
    Page = MarketPage;
  } else if (route === '/orders/create' || route === '/order/new') {
    Page = OrderCreatePage;
  } else if (route.startsWith('/orders/')) {
    Page = OrderDetailPage;
  } else if (route === '/tasks') {
    Page = MarketPage;
  } else if (route === '/tasks/create' || route === '/task/new') {
    Page = TaskCreatePage;
  } else if (route.startsWith('/tasks/')) {
    Page = TaskDetailPage;
  } else if (route === '/proposals') {
    Page = ProposalsPage;
  } else if (route.startsWith('/proposals/create')) {
    Page = ProposalsCreate;
  } else if (route.startsWith('/messages/')) {
    Page = MessagesPage;
  } else if (route === '/messages') {
    Page = MessagesPage;
  } else if (route.startsWith('/deal/open')) {
    Page = DealOpen;
  } else if (route.startsWith('/deal/')) {
    Page = DealPage;
  } else if (route === '/wallet') {
    Page = WalletPage;
  } else if (route === '/reviews') {
    Page = ProfilePage;
  } else if (route === '/talents') {
    Page = TalentsPage;
  } else if (route.startsWith('/u/')) {
    Page = PublicProfile;
  } else if (route === '/notifications') {
    Page = NotificationsPage;
  } else if (route === '/saved') {
    Page = SavedPage;
  } else if (route.startsWith('/disputes/')) {
    Page = DisputesPage;
  } else if (route === '/disputes') {
    Page = DisputesPage;
  } else if (route === '/settings/profile') {
    Page = SettingsProfilePage;
  } else if (route === '/settings/security') {
    Page = SettingsSecurityPage;
  } else if (route === '/settings/notifications') {
    Page = NotificationSettingsPage;
  } else if (route === '/settings/payments' || route === '/payment-methods') {
    Page = PaymentMethodsPage;
  } else if (route === '/media' || route === '/media-library') {
    Page = MediaLibraryPage;
  } else if (route === '/admin') {
    Page = AdminPage;
  } else if (route === '/terms') {
    Page = TermsPage;
  } else if (route === '/privacy') {
    Page = PrivacyPage;
  } else if (route === '/faq') {
    Page = FAQPage;
  } else if (route === '/contact') {
    Page = ContactPage;
  } else if (route === '/market' || route.startsWith('/market?')) {
    Page = MarketPage;
  } else if (route === '/my-orders') {
    Page = MyOrdersPage;
  } else if (route === '/my-tasks') {
    Page = MyTasksPage;
  } else if (route === '/404') {
    Page = NotFound;
  } else {
    Page = NotFound;
  }

  const isAuthPage = route === '/login' || route === '/register' || route === '/auth/login' || route === '/auth/register' || route === '/onboarding';

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        {!isAuthPage && <NavBar />}
        <Page />
        {!isAuthPage && <Footer />}
      </div>
    </AuthProvider>
  );
}

export default App;
