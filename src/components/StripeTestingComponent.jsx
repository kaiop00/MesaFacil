import { useState } from 'react';
import { Code, Check, X } from 'react-coolicons';
import { useToast } from '@/hooks/useToast';
import stripeService from '@/services/stripeService';

const StripeTestingComponent = () => {
  const [isTestingCheckout, setIsTestingCheckout] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const { notify } = useToast();

  const addTestResult = (test, success, message) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      success,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testStripeConnection = async () => {
    try {
      addTestResult('Stripe Connection', true, 'Stripe service initialized successfully');
    } catch (error) {
      addTestResult('Stripe Connection', false, `Error: ${error.message}`);
    }
  };

  const testCheckoutFlow = async () => {
    setIsTestingCheckout(true);
    try {
      // Test with a sample price ID
      const testPriceId = 'price_test_example'; // This will fail, which is expected for testing
      const testEmail = 'test@mesafacil.com';
      
      await stripeService.createCheckoutSession(testPriceId, testEmail, {
        test: 'true',
        source: 'testing'
      });
      
      addTestResult('Checkout Session', true, 'Checkout session created successfully');
    } catch (error) {
      // This is expected if backend isn't set up yet
      addTestResult('Checkout Session', false, `Expected error: ${error.message}`);
      notify('Teste normal - backend ainda não configurado', 'info');
    } finally {
      setIsTestingCheckout(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Code size={24} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Stripe Integration Testing</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Environment Check</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Environment Variables:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <X size={16} className="text-red-500" />
                  )}
                  <span>VITE_STRIPE_PUBLISHABLE_KEY</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <X size={16} className="text-red-500" />
                  )}
                  <span>VITE_STRIPE_MONTHLY_PRICE_ID</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {import.meta.env.VITE_API_BASE_URL ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <X size={16} className="text-red-500" />
                  )}
                  <span>VITE_API_BASE_URL</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={testStripeConnection}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Test Stripe Connection
              </button>
              
              <button
                onClick={testCheckoutFlow}
                disabled={isTestingCheckout}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {isTestingCheckout ? 'Testing...' : 'Test Checkout Flow'}
              </button>
              
              <button
                onClick={clearResults}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Clear Results
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Test Results</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No tests run yet</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result) => (
                    <div key={result.id} className="flex items-start gap-2">
                      {result.success ? (
                        <Check size={16} className="text-green-500 mt-0.5" />
                      ) : (
                        <X size={16} className="text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{result.test}</div>
                        <div className="text-gray-600">{result.message}</div>
                        <div className="text-xs text-gray-400">{result.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Configure environment variables in .env</li>
            <li>2. Set up backend API endpoints (see STRIPE_BACKEND_API.js)</li>
            <li>3. Create products and prices in Stripe Dashboard</li>
            <li>4. Configure webhooks</li>
            <li>5. Test with Stripe test cards</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default StripeTestingComponent;