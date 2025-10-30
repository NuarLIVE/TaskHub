import { useState, useEffect } from 'react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import OrderCreatePage from './pages/OrderCreatePage';
import TaskCreatePage from './pages/TaskCreatePage';
import MarketPage from './pages/MarketPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

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
  switch (route) {
    case '/':
      Page = HomePage;
      break;
    case '/profile':
      Page = ProfilePage;
      break;
    case '/order/new':
      Page = OrderCreatePage;
      break;
    case '/task/new':
      Page = TaskCreatePage;
      break;
    case '/market':
      Page = MarketPage;
      break;
    case '/login':
      Page = LoginPage;
      break;
    case '/register':
      Page = RegisterPage;
      break;
    default:
      Page = () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">404</h2>
            <p className="text-[#3F7F6E] mb-4">Страница не найдена</p>
            <a href="#/" className="text-[#6FE7C8] hover:underline">Вернуться на главную</a>
          </div>
        </div>
      );
  }

  const isAuthPage = route === '/login' || route === '/register';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isAuthPage && <NavBar />}
      <Page />
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
