import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={32} />
                            <h1 className="text-xl font-bold">Something went wrong</h1>
                        </div>

                        <p className="text-slate-300 mb-4">
                            The application encountered a critical error and could not render.
                        </p>

                        <div className="bg-slate-950 p-4 rounded-lg overflow-auto max-h-60 mb-6 border border-slate-700">
                            <code className="text-red-400 text-xs font-mono block mb-2">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <pre className="text-slate-500 text-xs font-mono whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
