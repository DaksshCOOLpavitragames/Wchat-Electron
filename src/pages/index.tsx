import { FC, useState } from "react";
import { Layout } from "../components/Layout";
import { getDatabase, ref, set, get, child } from "firebase/database"; // Firebase Realtime Database functions
import { initializeApp } from "firebase/app";
import { useNavigate } from "react-router-dom";  // Import the hook
import  firebaseConfig  from "../FirebaseConfig";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const IndexPage: FC = () => {
  const [username, setUsername] = useState<string>("");  // State for the username input
  const [loginUsername, setLoginUsername] = useState<string>("");  // State for login input
  const [error, setError] = useState<string>("");        // State for handling errors
  const [isRegistering, setIsRegistering] = useState<boolean>(true); // Toggle between register and login
  const navigate = useNavigate();  // Create a navigate function

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username.trim() === "") {
      setError("Username cannot be empty");
      return;
    }

    try {
      const usernameRef = ref(db, `users/${username}`);
      const snapshot = await get(child(ref(db), `users/${username}`));

      if (snapshot.exists()) {
        setError("Username already exists");
        return;
      }

      await set(usernameRef, { username });
      setError("");
      alert("Username registered successfully");

      localStorage.setItem("username", username); // Save username locally
	  const storedUsername = localStorage.getItem("username");
	  alert(storedUsername);
      setUsername("");
      navigate("/app");  // Assumes the route to the app is "/app"
    } catch (err) {
      console.error("Error saving username:", err);
      setError("Failed to register username. Please try again.");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loginUsername.trim() === "") {
      setError("Username cannot be empty");
      return;
    }

    try {
      const usernameRef = ref(db, `users/${loginUsername}`);
      const snapshot = await get(child(ref(db), `users/${loginUsername}`));

      if (snapshot.exists()) {
        localStorage.setItem("username", loginUsername); // Save username locally
        setError("");
		const storedUsername = localStorage.getItem("username");
		alert(storedUsername);
        alert("Logged in successfully");
        setLoginUsername("");
        navigate("/app");  // Assumes the route to the app is "/app"
      } else {
        setError("Username does not exist");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setError("Failed to log in. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="fixed w-screen bg-zinc-900 flex flex-col items-center justify-center w-full h-screen space-y-3">
        <h1 className="text-3xl font-bold text-white text-center">
          {isRegistering ? "Register Your Name" : "Welcome Back!"}
        </h1>
        <p className="text-lg text-gray-400 text-center">
          {isRegistering
            ? "Please enter your name to register."
            : "Enter your username to log in."}
        </p>

        <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit}>
          <div className="bg-zinc-900 flex flex-col items-center justify-center space-y-3">
            <input
              type="text"
              id={isRegistering ? "username" : "loginUsername"}
              value={isRegistering ? username : loginUsername}
              onChange={(e) =>
                isRegistering
                  ? setUsername(e.target.value)
                  : setLoginUsername(e.target.value)
				  
              }
              className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isRegistering ? "Enter your username" : "Enter your username"}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition align-center w-full"
            >
              {isRegistering ? "Register" : "Log In"}
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition align-center w-full mt-2"
            >
              {isRegistering ? "I already have a username" : "Register a new username"}
            </button>
			{error && <p className="text-red-500">{error}</p>}
          </div>
        </form>
      </div>
    </Layout>
  );
};
