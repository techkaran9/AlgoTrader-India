import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

interface SignupFormProps {
  onToggleMode: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onToggleMode }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <div className="text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
          <p className="text-gray-300 mb-6">
            Your account has been created successfully. You can now login.
          </p>
          <button
            onClick={onToggleMode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
          >
            Go to Login
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-20">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? <Spinner /> : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onToggleMode}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Already have an account? Login
        </button>
      </div>
    </Card>
  );
};

export default SignupForm;
