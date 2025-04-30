
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
      // Add mode: 'no-cors' if the request is to an external domain
      mode: new URL(config.url).origin === window.location.origin ? 'cors' : 'no-cors',
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
    
    // Execute the request
    const response = await fetch(url, requestOptions);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    console.log(`HTTP request completed with status ${response.status}`);
    
    // Get response body if possible
    let responseBody: string | undefined;
    try {
      // For no-cors requests, we won't be able to read the response
      if (requestOptions.mode !== 'no-cors') {
        responseBody = await response.text();
      } else {
        // For no-cors requests, we'll assume success if we got this far
        responseBody = "Response not available due to CORS restrictions";
      }
    } catch (e) {
      console.error("Failed to read response body:", e);
    }
    
    // Check if status code is in the success codes list
    // For no-cors requests, we'll always return success if the request didn't throw
    const isSuccess = requestOptions.mode === 'no-cors' || 
                     (config.successCodes && config.successCodes.includes(response.status));
    
    return {
      status: isSuccess ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      responseBody: responseBody,
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
