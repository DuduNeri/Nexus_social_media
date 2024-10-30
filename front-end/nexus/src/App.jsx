import React, { useState, useEffect } from 'react'; // Apenas uma vez
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom'; // Importando Router

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Para navegação

  // useEffect para verificar a autenticação
// useEffect(() => {
//   if (localStorage.getItem("authenticated") === "true") {
//     navigate("/dashboard/feed");
//   }
// }, [navigate]);
 // Adicione navigate como dependência

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/login', {
        email: email, // Usa o estado definido
        password: password // Usa o estado definido
      });
      
      // Supondo que o login foi bem-sucedido, armazena a autenticação
      localStorage.setItem("authenticated", "true");
      console.log("Login bem-sucedido:", response.data);
      navigate("/dashboard/feed"); // Redireciona para o feed após login bem-sucedido
    } catch (error) {
      console.error("Login falhou:", error);
    }
  };

  return (
    <div>
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

// Certifique-se de que o App seja encapsulado em um Router no seu ponto de entrada
function Main() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        {/* Adicione outras rotas aqui */}
      </Routes>
    </Router>
  );
}

export default Main;
