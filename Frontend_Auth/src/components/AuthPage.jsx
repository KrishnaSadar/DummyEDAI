import React, { useState } from 'react';

const AuthPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username === 'admin' && password === 'admin') {
      onLogin(true);
    } else {
      setError('Invalid credentials. Use admin/admin to login.');
      onLogin(false);
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">DataQuery AI</h1>
          <p className="auth-subtitle">Your intelligent data analysis companion</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </form>
        
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center', 
          fontSize: '12px', 
          color: 'rgba(255, 255, 255, 0.5)' 
        }}>
          Demo credentials: admin / admin
        </div>
      </div>
    </div>
  );
};

export default AuthPage;