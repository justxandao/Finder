import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import useStore from '../store/useStore';
import './Login.css';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const { setSession } = useStore();

    useEffect(() => {
        // Verifica sessão ativa ao carregar
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Ouve mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Verifique seu email para o link de confirmação!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error) {
            setErrorMsg(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2><i className="fa-solid fa-map-location-dot"></i> PokeXGames Finder</h2>
                <p className="login-subtitle">Faça login para acessar o rastreador avançado</p>
                
                {errorMsg && <div className="login-error">{errorMsg}</div>}

                <form onSubmit={handleAuth} className="login-form">
                    <div className="input-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="seu@email.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Senha</label>
                        <input 
                            type="password" 
                            placeholder="Sua senha" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Carregando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                    </button>
                </form>

                <div className="login-footer">
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth-btn">
                        {isSignUp ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </div>
    );
}
