import { googleLogout } from '@react-oauth/google';
import axios from 'axios';

function Logout() {
  const handleLogout = async () => {
    googleLogout(); 
    
    localStorage.setItem('clientToken','');

  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}

export default Logout;
