import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTrading } from '../context/useTrading';
import { ArrowLeft, Save, User, Mail, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user, profile, fetchData } = useTrading();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            fetchData(user.id); // Refresh global state
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-10 text-white">Please login first.</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 justify-center flex">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Profile Settings
                    </h1>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
                    {/* Access Info */}
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-700/50">
                        <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-300">
                            {user.email[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Account Type</div>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/20">
                                    Pro Trader
                                </span>
                                <span className="text-slate-500 text-sm">Member since {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        {message && (
                            <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <User size={16} />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Enter your display name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Mail size={16} />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-3 px-4 text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-500">Email cannot be changed.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Shield size={16} />
                                User ID
                            </label>
                            <div className="font-mono text-xs bg-slate-950 p-3 rounded-lg text-slate-500 break-all border border-slate-800">
                                {user.id}
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
