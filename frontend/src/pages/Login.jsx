import { useState } from "react";
import PaperPlane from "../components/PaperPlane";
import ThemeToggle from "../components/ThemeToggle";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth";
import { socket } from "../api/socket";

// The design system and prototypes page. Set VITE_DESIGN_URL to point somewhere else.
const DESIGN_URL = import.meta.env.VITE_DESIGN_URL || "https://claude.ai/artifact/K2qNVyjyRUqorCp6yngkpf";

function Login() {
    const navigate = useNavigate();

    // Local component state is sufficient because these values
    // are only needed while filling out this form.
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        try {
            setLoading(true);

            /**
             * Backend returns the authenticated user and stores
             * the JWT inside an HttpOnly cookie.
             *
             * Because axios is configured with:
             *      withCredentials: true
             *
             * the browser automatically stores the cookie.
             *
             * We intentionally DO NOT manually save any JWT in
             * localStorage/sessionStorage.
             */
            const loggedInUser = await login(formData);

            console.log(loggedInUser);

            

            navigate("/chat");


        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to login."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-theme"><ThemeToggle /></div>
            <div className="auth-card panel">
                <svg className="trail" viewBox="0 0 150 60" aria-hidden="true">
                    <path d="M4 52 C 30 4, 70 66, 100 30 S 130 8, 140 14" fill="none" stroke="var(--ink)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
                </svg>
                <div className="brand">
                    <PaperPlane size={44} />
                    <span className="brand-name">Chit-Chat</span>
                </div>
                <h1>Welcome back</h1>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit" className="pink" disabled={loading}>
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>
                <p className="switch">
                    New here? <Link to="/signup">Make an account</Link>
                </p>
                <p className="switch">
                    <a href={DESIGN_URL} target="_blank" rel="noopener noreferrer">See the Chit-Chat Arcade design</a>
                </p>
            </div>
        </div>
    );
}

export default Login;