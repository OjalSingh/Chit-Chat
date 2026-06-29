import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth";

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

            // Useful while developing.
            // Remove this once authentication is verified.
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
        <div style={{ padding: "2rem" }}>
            <h1>Login</h1>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Email</label>
                    <br />

                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <br />

                <div>
                    <label>Password</label>
                    <br />

                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <br />

                {error && (
                    <p style={{ color: "red" }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>

            </form>

            <br />

            <p>
                Don't have an account?{" "}
                <Link to="/signup">
                    Signup
                </Link>
            </p>

        </div>
    );
}

export default Login;