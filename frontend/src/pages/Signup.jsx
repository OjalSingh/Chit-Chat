import { useState } from "react";
import PaperPlane from "../components/PaperPlane";
import ThemeToggle from "../components/ThemeToggle";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";

function Signup() {
    const navigate = useNavigate();

    // Local component state is sufficient because these values
    // are only needed while filling out this form.
    const [formData, setFormData] = useState({
        username: "",
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
    /*
     * Prevent the browser's default form submission.
     * We want React to handle the request asynchronously
     * without causing a page refresh.
     */
    e.preventDefault();

    /*
     * Clear any previous error before attempting
     * another signup request.
     */
    setError("");

    try {
        /*
         * Disable the submit button while the request
         * is in progress to prevent duplicate account
         * creation from multiple clicks.
         */
        setLoading(true);

        /*
         * Send the user's registration details to the
         * backend. On success, the backend creates the
         * user, hashes the password, generates a JWT,
         * and stores it in an HttpOnly cookie.
         */
        await signup(formData);

        /*
         * Since the user is authenticated immediately
         * after signup, redirect them directly to the
         * chat page instead of requiring another login.
         */
        navigate("/chat");

    } catch (err) {

        /*
         * Display the backend validation message when
         * available (e.g., duplicate email, invalid
         * password). Otherwise, show a generic error.
         */
        setError(
            err.response?.data?.message ||
            "Unable to create account."
        );

    } finally {

        /*
         * Re-enable the form regardless of whether the
         * request succeeded or failed.
         */
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
                <h1>Join the flight</h1>
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" name="username" value={formData.username} onChange={handleChange} required />
                    </div>
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
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>
                <p className="switch">
                    Already flying with us? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;