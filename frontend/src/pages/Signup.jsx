import { useState } from "react";
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
    <div style={{ padding: "2rem" }}>
        <h1>Signup</h1>

        <form onSubmit={handleSubmit}>

            {/* Username */}
            <div>
                <label>Username</label>
                <br />

                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />
            </div>

            <br />

            {/* Email */}
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

            {/* Password */}
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

            {/* Display backend validation errors */}
            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
            >
                {loading
                    ? "Creating Account..."
                    : "Create Account"}
            </button>

        </form>

        <br />

        <p>
            Already have an account?{" "}
            <Link to="/login">
                Login
            </Link>
        </p>

        </div>
    
);
}

export default Signup;