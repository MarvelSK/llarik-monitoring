
import { HttpConfig } from "@/types/check";

export async function executeHttpRequest(config: HttpConfig): Promise<{
  status: 'success' | 'failure';
  statusCode?: number;
  responseTime: number;
  responseBody?: string;
  error?: string;
}> {
  try {
    const startTime = performance.now();
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method: config.method,
      headers: config.headers ? new Headers(config.headers) : undefined,
    };
    
    // Add body for non-GET requests if provided
    if (config.body && config.method !== 'GET' && config.method !== 'HEAD') {
      requestOptions.body = config.body;
    }
    
    // Build URL with params if any
    let url = config.url;
    if (config.params && Object.keys(config.params).length > 0) {
      const urlObj = new URL(url);
      Object.entries(config.params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value));
      });
      url = urlObj.toString();
    }
    
    console.log(`Executing HTTP request to ${url} with method ${config.method}`);
    
    // Determine if this is a cross-origin request
    const isCrossOrigin = (() => {
      try {
        const urlObj = new URL(url);
        return urlObj.origin !== window.location.origin;
      } catch (e) {
        return true; // If URL parsing fails, assume cross-origin
      }
    })();
    
    // Handle different modes for different types of requests
    if (isCrossOrigin) {
      // For cross-origin requests to our own 'update-check' edge function, 
      // use a direct edge function call instead of fetch where possible
      if (url.includes('update-check') && url.includes('supabase.co/functions')) {
        console.log('Using direct edge function call for update-check ping');
        // Make a special request to our update-check edge function
        return await makePingRequest(url, config);
      }
    }
    
    // Standard fetch for all other requests
    const response = await fetch(url, requestOptions);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.log(`HTTP request completed with status ${response.status}`);
    
    // Get response body
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch (e) {
      console.error("Failed to read response body:", e);
    }
    
    // Check if status code is in the success codes list
    const isSuccess = config.successCodes && config.successCodes.includes(response.status);
    
    return {
      status: isSuccess ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      responseBody,
    };
  } catch (error) {
    console.error("HTTP request execution error:", error);
    return {
      status: 'failure',
      responseTime: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Special function to handle pings to our update-check function which might have CORS restrictions
async function makePingRequest(url: string, config: HttpConfig): Promise<{
  status: 'success' | 'failure';
  statusCode?: number;
  responseTime: number;
  responseBody?: string;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    // Extract the check ID from the URL
    const urlParts = url.split('/');
    const checkId = urlParts[urlParts.length - 1];
    
    if (!checkId) {
      return {
        status: 'failure',
        responseTime: 0,
        error: 'Invalid check ID in URL'
      };
    }
    
    // For update-check function, use a specialized approach
    // This ensures the check is always marked as "up" by directly calling the edge function
    const supabaseUrl = `${window.location.origin}/ping/${checkId}`;
    
    console.log(`Redirecting ping to our own ping handler: ${supabaseUrl}`);
    
    // Use fetch with credentials to ensure cookies are sent
    const response = await fetch(supabaseUrl, {
      method: 'GET',
      credentials: 'include',
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    // Try to get the response body
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch (e) {
      console.error('Error reading response:', e);
    }
    
    return {
      status: response.ok ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      responseBody
    };
  } catch (error) {
    console.error('Error in makePingRequest:', error);
    const endTime = performance.now();
    
    return {
      status: 'failure',
      responseTime: Math.round(endTime - startTime),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
